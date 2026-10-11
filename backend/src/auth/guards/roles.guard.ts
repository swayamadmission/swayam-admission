import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IUser } from '../interfaces/user.interface';
import { Role } from '@prisma/client';
import { DataScopeService } from '../data-scope.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Optional() private dataScopeService?: DataScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest() as { user: IUser };
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Direct legacy enum match
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Dynamic database roles & security lock check
    if (this.dataScopeService) {
      try {
        const ctx = await this.dataScopeService.resolveDataScope(user.id);

        if (ctx.isLocked) {
          throw new ForbiddenException(
            'Account Security Alert: One or more of your assigned roles is locked for security inspection. Access denied.',
          );
        }

      if (ctx.isSuperAdmin) {
        return true;
      }

      const hasDynamicRole = ctx.roles.some((assigned) => {
        const slug = assigned.slug?.toLowerCase().replace(/_/g, '-');
        const nameUpper = assigned.name?.toUpperCase().replace(/\s+/g, '_');
        return requiredRoles.some((req) => {
          const reqStr = String(req);
          const reqSlug = reqStr.toLowerCase().replace(/_/g, '-');
          return (
            slug === reqSlug ||
            nameUpper === reqStr ||
            (reqStr === 'ADMIN' && (slug === 'super-admin' || slug === 'admin')) ||
            (reqStr === 'SUPER_ADMIN' && slug === 'super-admin') ||
            (reqStr === 'SENIOR_COUNSELOR' &&
              (slug === 'senior-counselor' ||
                slug === 'state-manager' ||
                slug === 'director' ||
                slug === 'super-admin')) ||
            (reqStr === 'COUNSELOR' &&
              (slug === 'counselor' ||
                slug === 'senior-counselor' ||
                slug === 'state-manager' ||
                slug === 'director' ||
                slug === 'super-admin'))
          );
        });
      });

      if (hasDynamicRole) {
        return true;
      }
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
    }
  }

    throw new ForbiddenException('Insufficient permissions: Required role not held.');
  }
}
