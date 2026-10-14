import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any, _info: any, context: ExecutionContext): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }

    if (user.mustChangePassword) {
      const request = context.switchToHttp().getRequest();
      const path = (request.url || '').split('?')[0];
      const allowedPaths = [
        '/api/auth/first-login/send-otp',
        '/api/auth/first-login/change-password',
        '/api/auth/change-password',
        '/api/auth/logout',
        '/api/auth/me',
        '/api/users/me',
        '/auth/first-login/send-otp',
        '/auth/first-login/change-password',
        '/auth/change-password',
        '/auth/logout',
        '/auth/me',
        '/users/me',
      ];

      const isAllowed = allowedPaths.some((p) => path === p || path.startsWith(p));
      if (!isAllowed) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'MANDATORY_PASSWORD_CHANGE_REQUIRED',
          message:
            'You must complete your mandatory temporary password change before accessing this resource.',
        });
      }
    }

    return user;
  }
}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    return (user ?? null) as TUser;
  }
}

