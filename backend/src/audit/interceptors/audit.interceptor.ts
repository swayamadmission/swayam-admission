import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import {
  AUDIT_METADATA_KEY,
  AuditOptions,
} from '../decorators/audit.decorator';
import { AuditService } from '../audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.getAllAndOverride<AuditOptions>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    const startTime = Date.now();
    const req = context.switchToHttp().getRequest();

    if (!req) {
      return next.handle();
    }

    const method = req.method;
    const url = req.originalUrl || req.url;
    const user = req.user;
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers?.['user-agent'] || '';

    // Parse simple user agent
    const browser = this.parseBrowser(userAgent);
    const os = this.parseOS(userAgent);
    const device = this.parseDevice(userAgent);

    return next.handle().pipe(
      tap((resData) => {
        const executionTime = Date.now() - startTime;
        if (auditOptions) {
          this.auditService
            .logAction({
              module: auditOptions.module,
              action: auditOptions.action,
              severity: auditOptions.severity || 'SUCCESS',
              status: 'SUCCESS',
              description:
                auditOptions.description ||
                `${auditOptions.action} on ${auditOptions.module}`,
              userId: user?.id,
              userName: user?.fullName || user?.name || user?.email,
              email: user?.email,
              roleId: user?.role,
              ipAddress: ip,
              userAgent,
              browser,
              operatingSystem: os,
              deviceType: device,
              requestMethod: method,
              endpoint: url,
              executionTime,
              newData:
                req.body && Object.keys(req.body).length > 0
                  ? req.body
                  : undefined,
            })
            .catch((err) =>
              this.logger.error('Failed to log audit interceptor entry', err),
            );
        }
      }),
      catchError((err) => {
        const executionTime = Date.now() - startTime;
        if (auditOptions) {
          this.auditService
            .logAction({
              module: auditOptions.module,
              action: auditOptions.action,
              severity: 'ERROR',
              status: 'FAILED',
              description: `Error executing ${auditOptions.action}: ${err.message || 'Execution error'}`,
              userId: user?.id,
              userName: user?.fullName || user?.email,
              email: user?.email,
              roleId: user?.role,
              ipAddress: ip,
              userAgent,
              browser,
              operatingSystem: os,
              deviceType: device,
              requestMethod: method,
              endpoint: url,
              executionTime,
            })
            .catch((e) =>
              this.logger.error('Failed to log error audit entry', e),
            );
        }
        throw err;
      }),
    );
  }

  private parseBrowser(ua: string): string {
    if (/chrome|crios/i.test(ua)) return 'Chrome';
    if (/firefox|fxios/i.test(ua)) return 'Firefox';
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
    if (/edg/i.test(ua)) return 'Edge';
    return 'Browser';
  }

  private parseOS(ua: string): string {
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    return 'OS';
  }

  private parseDevice(ua: string): string {
    if (/mobile/i.test(ua)) return 'Mobile';
    if (/tablet|ipad/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }
}
