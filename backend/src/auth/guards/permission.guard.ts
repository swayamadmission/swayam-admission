import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthorizationService } from '../authorization.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authzService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      if (!requiredPermissions || requiredPermissions.length === 0) {
        return true;
      }
      throw new ForbiddenException('User not authenticated');
    }

    const authzResult = await this.authzService.authorize(
      user,
      requiredPermissions || [],
    );

    // Attach effective resolved roles, permissions, data scopes, and authContext to request user
    request.user.effectivePermissions = authzResult.effectivePermissions;
    request.user.activeRoles = authzResult.userRoles;
    request.user.dataScopes = authzResult.dataScopes;
    request.user.authContext = authzResult.authContext;

    return authzResult.allowed;
  }
}
