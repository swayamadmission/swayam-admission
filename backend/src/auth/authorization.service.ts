import {
  Injectable,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { DataScopeService, DataScopeContext } from './data-scope.service';

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
          authContext.permissions.includes(perm),
        )
      : requiredPermissions.some((perm) =>
          authContext.permissions.includes(perm),
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
