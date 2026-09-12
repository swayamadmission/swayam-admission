import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EffectivePermissionsPreview {
  roleId: string;
  roleName: string;
  currentParentId: string | null;
  newParentId: string | null;
  directPermissions: string[];
  currentInheritedPermissions: string[];
  currentEffectivePermissions: string[];
  newInheritedPermissions: string[];
  newEffectivePermissions: string[];
  lostPermissions: string[];
  gainedPermissions: string[];
}

@Injectable()
export class RoleHierarchyService {
  private readonly logger = new Logger(RoleHierarchyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate that assigning targetRoleId under newParentRoleId will not cause a cycle or invalid state
   */
  async validateHierarchyAssignment(
    roleId: string,
    newParentRoleId: string | null,
  ): Promise<void> {
    if (!newParentRoleId) {
      return; // Root level is always safe
    }

    if (roleId === newParentRoleId) {
      throw new BadRequestException('A role cannot be its own parent.');
    }

    const [role, newParent] = await Promise.all([
      this.prisma.roleEntity.findUnique({
        where: { id: roleId },
      }),
      this.prisma.roleEntity.findUnique({
        where: { id: newParentRoleId },
      }),
    ]);

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    if (!newParent) {
      throw new BadRequestException(
        `Target parent role with ID "${newParentRoleId}" not found`,
      );
    }

    // Check if newParent is already a descendant of role (which would create a cycle)
    const descendantIds = await this.getDescendantRoleIds(roleId);
    if (descendantIds.includes(newParentRoleId)) {
      throw new BadRequestException(
        `Circular hierarchy detected: Role "${newParent.name}" is already a descendant of "${role.name}". Cannot make it a parent.`,
      );
    }
  }

  /**
   * Get all descendant IDs of a given role recursively
   */
  async getDescendantRoleIds(roleId: string): Promise<string[]> {
    const descendants: string[] = [];
    const queue: string[] = [roleId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const children = await this.prisma.roleEntity.findMany({
        where: { parentRoleId: currentId, deletedAt: null },
        select: { id: true },
      });

      for (const child of children) {
        if (!visited.has(child.id)) {
          descendants.push(child.id);
          queue.push(child.id);
        }
      }
    }

    return descendants;
  }

  /**
   * Get all ancestor IDs of a given role (from parent up to root)
   */
  async getAncestorRoleIds(roleId: string): Promise<string[]> {
    const ancestors: string[] = [];
    let currentId: string | null = roleId;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const role: { parentRoleId: string | null } | null =
        await this.prisma.roleEntity.findUnique({
          where: { id: currentId },
          select: { parentRoleId: true },
        });

      if (!role || !role.parentRoleId) {
        break;
      }

      ancestors.push(role.parentRoleId);
      currentId = role.parentRoleId;
    }

    return ancestors;
  }

  /**
   * Calculate direct, inherited, and effective permissions for a role
   */
  async getEffectivePermissionsForRole(roleId: string): Promise<{
    direct: string[];
    inherited: string[];
    effective: string[];
  }> {
    const role = await this.prisma.roleEntity.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          where: { allow: true },
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    const directCodes = role.permissions.map((rp) => rp.permission.code);
    const directSet = new Set<string>(directCodes);

    // Get permissions inherited from all ancestors
    const ancestorIds = await this.getAncestorRoleIds(roleId);
    const inheritedSet = new Set<string>();

    if (ancestorIds.length > 0) {
      const ancestorPermissions = await this.prisma.rolePermission.findMany({
        where: {
          roleId: { in: ancestorIds },
          allow: true,
          role: { isActive: true, status: 'ACTIVE', deletedAt: null },
        },
        include: { permission: true },
      });

      for (const ap of ancestorPermissions) {
        if (!directSet.has(ap.permission.code)) {
          inheritedSet.add(ap.permission.code);
        }
      }
    }

    const effectiveSet = new Set<string>([...directSet, ...inheritedSet]);

    return {
      direct: Array.from(directSet),
      inherited: Array.from(inheritedSet),
      effective: Array.from(effectiveSet),
    };
  }

  /**
   * Preview effective permission changes before re-parenting a role
   */
  async previewReparent(
    roleId: string,
    newParentRoleId: string | null,
  ): Promise<EffectivePermissionsPreview> {
    await this.validateHierarchyAssignment(roleId, newParentRoleId);

    const role = await this.prisma.roleEntity.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          where: { allow: true },
          include: { permission: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }

    const directPermissions = role.permissions.map((rp) => rp.permission.code);
    const directSet = new Set(directPermissions);

    // Current inherited
    const currentAncestors = await this.getAncestorRoleIds(roleId);
    const currentInheritedSet = new Set<string>();
    if (currentAncestors.length > 0) {
      const curAncestorPerms = await this.prisma.rolePermission.findMany({
        where: {
          roleId: { in: currentAncestors },
          allow: true,
          role: { isActive: true, status: 'ACTIVE', deletedAt: null },
        },
        include: { permission: true },
      });
      for (const p of curAncestorPerms) {
        if (!directSet.has(p.permission.code)) {
          currentInheritedSet.add(p.permission.code);
        }
      }
    }

    // New simulated inherited
    const newInheritedSet = new Set<string>();
    if (newParentRoleId) {
      const simulatedAncestors = [
        newParentRoleId,
        ...(await this.getAncestorRoleIds(newParentRoleId)),
      ];

      const newAncestorPerms = await this.prisma.rolePermission.findMany({
        where: {
          roleId: { in: simulatedAncestors },
          allow: true,
          role: { isActive: true, status: 'ACTIVE', deletedAt: null },
        },
        include: { permission: true },
      });

      for (const p of newAncestorPerms) {
        if (!directSet.has(p.permission.code)) {
          newInheritedSet.add(p.permission.code);
        }
      }
    }

    const currentEffective = new Set([...directSet, ...currentInheritedSet]);
    const newEffective = new Set([...directSet, ...newInheritedSet]);

    const lostPermissions = Array.from(currentEffective).filter(
      (p) => !newEffective.has(p),
    );
    const gainedPermissions = Array.from(newEffective).filter(
      (p) => !currentEffective.has(p),
    );

    return {
      roleId: role.id,
      roleName: role.name,
      currentParentId: role.parentRoleId,
      newParentId: newParentRoleId,
      directPermissions: Array.from(directSet),
      currentInheritedPermissions: Array.from(currentInheritedSet),
      currentEffectivePermissions: Array.from(currentEffective),
      newInheritedPermissions: Array.from(newInheritedSet),
      newEffectivePermissions: Array.from(newEffective),
      lostPermissions,
      gainedPermissions,
    };
  }

  /**
   * Get the complete role hierarchy tree
   */
  async getHierarchyTree() {
    const roles = await this.prisma.roleEntity.findMany({
      where: { deletedAt: null },
      include: {
        permissions: {
          where: { allow: true },
          include: { permission: true },
        },
        _count: { select: { userRoles: true } },
      },
      orderBy: [{ priority: 'desc' }, { level: 'asc' }],
    });

    const roleMap = new Map<string, any>();
    for (const r of roles) {
      roleMap.set(r.id, {
        id: r.id,
        name: r.name,
        slug: r.slug,
        level: r.level,
        priority: r.priority,
        department: r.department,
        status: r.status,
        isActive: r.isActive,
        isProtected: r.isProtected,
        color: r.color,
        icon: r.icon,
        parentRoleId: r.parentRoleId,
        userCount: r._count.userRoles,
        directPermissionsCount: r.permissions.length,
        children: [],
      });
    }

    const tree: any[] = [];
    for (const r of roles) {
      const node = roleMap.get(r.id);
      if (r.parentRoleId && roleMap.has(r.parentRoleId)) {
        roleMap.get(r.parentRoleId).children.push(node);
      } else {
        tree.push(node);
      }
    }

    return { tree, totalRoles: roles.length };
  }
}
