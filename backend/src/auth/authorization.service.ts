import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { DataScopeService, DataScopeContext } from './data-scope.service';
import { MODULE_ALIASES } from '../roles/seed-permissions';

export interface AuthorizationResult {
  allowed: boolean;
  userRoles: string[];
  effectivePermissions: string[];
  dataScopes: string[];
  authContext: DataScopeContext;
  reason?: string;
}

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(private readonly dataScopeService: DataScopeService) {}

  /**
   * Check if a required permission matches any of user permissions, supporting module aliases and multi-part codes
   */
  matchesPermission(userPerms: string[], requiredPerm: string): boolean {
    if (!userPerms || userPerms.length === 0) return false;
    if (userPerms.includes(requiredPerm) || userPerms.includes('*')) {
      return true;
    }

    const lastDotIndex = requiredPerm.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return false;
    }

    const reqMod = requiredPerm.substring(0, lastDotIndex);
    const reqAct = requiredPerm.substring(lastDotIndex + 1);

    // Expand candidate modules for reqMod
    const matchingModules = new Set<string>([reqMod]);
    for (const [key, aliases] of Object.entries(MODULE_ALIASES)) {
      if (key === reqMod || aliases.includes(reqMod)) {
        matchingModules.add(key);
        for (const a of aliases) matchingModules.add(a);
      }
    }

    // Check each user permission with alias expansion
    for (const userPerm of userPerms) {
      if (userPerm === '*' || userPerm === `${reqMod}.*`) return true;
      const userLastDot = userPerm.lastIndexOf('.');
      if (userLastDot === -1) continue;

      const userMod = userPerm.substring(0, userLastDot);
      const userAct = userPerm.substring(userLastDot + 1);

      if (userAct !== reqAct && userAct !== '*') continue;

      if (matchingModules.has(userMod)) {
        return true;
      }

      const userAliases = MODULE_ALIASES[userMod] || [];
      if (userAliases.includes(reqMod) || userAliases.some((a) => matchingModules.has(a))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all active effective permissions and data scopes for a user
   */
  async getUserEffectiveAccess(userId: string): Promise<{
    roles: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      isProtected: boolean;
      dataScope: string;
      department?: string;
    }>;
    effectivePermissions: string[];
    dataScopes: string[];
    isSuperAdmin: boolean;
    isLocked: boolean;
    authContext: DataScopeContext;
  }> {
    const ctx = await this.dataScopeService.resolveDataScope(userId);
    return {
      roles: ctx.roles,
      effectivePermissions: ctx.permissions,
      dataScopes: ctx.dataScopes,
      isSuperAdmin: ctx.isSuperAdmin,
      isLocked: ctx.isLocked,
      authContext: ctx,
    };
  }

  /**
   * Main authorization entry point: evaluate whether user can perform required permissions
   */
  async authorize(
    user: any,
    requiredPermissions?: string[],
    options?: {
      requireAll?: boolean;
      dataScope?: string;
      context?: any;
    },
  ): Promise<AuthorizationResult> {
    if (!user || !user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const authContext = await this.dataScopeService.resolveDataScope(user.id);

    if (authContext.isLocked) {
      throw new ForbiddenException(
        'Account Security Alert: One or more of your assigned roles is locked for security inspection. Access denied.',
      );
    }

    // Super Admin bypass
    if (authContext.isSuperAdmin) {
      return {
        allowed: true,
        userRoles: authContext.roleSlugs,
        effectivePermissions: authContext.permissions,
        dataScopes: ['GLOBAL'],
        authContext,
      };
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return {
        allowed: true,
        userRoles: authContext.roleSlugs,
        effectivePermissions: authContext.permissions,
        dataScopes: authContext.dataScopes,
        authContext,
      };
    }

    const requireAll = options?.requireAll !== false;
    const hasPermission = requireAll
      ? requiredPermissions.every((perm) =>
          this.matchesPermission(authContext.permissions, perm),
        )
      : requiredPermissions.some((perm) =>
          this.matchesPermission(authContext.permissions, perm),
        );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access Denied: You do not possess the required permission(s) [${requiredPermissions.join(', ')}] to perform this action.`,
      );
    }

    return {
      allowed: true,
      userRoles: authContext.roleSlugs,
      effectivePermissions: authContext.permissions,
      dataScopes: authContext.dataScopes,
      authContext,
    };
  }
}
