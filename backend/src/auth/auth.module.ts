import { Module, Global, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpAdminController } from './otp-admin.controller';
import { OtpAdminService } from './otp-admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthorizationService } from './authorization.service';
import { DataScopeService } from './data-scope.service';
import { RoleHierarchyService } from '../roles/role-hierarchy.service';
import { PermissionGuard } from './guards/permission.guard';
import { RolesGuard } from './guards/roles.guard';

import { LegalModule } from '../legal/legal.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    LegalModule,
    forwardRef(() => NotificationsModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        const isProd = config.get<string>('NODE_ENV') === 'production';
        if (isProd && (!secret || secret.length < 32 || secret === 'swayam_super_secret_key')) {
          throw new Error('FATAL SECURITY ERROR: Insecure or missing JWT_SECRET in production.');
        }
        return {
          secret: secret || (process.env.NODE_ENV === 'test' ? 'test_jwt_secret_key_minimum_32_characters_length' : 'swayam_development_local_jwt_secret_key_32_chars'),
          signOptions: {
            expiresIn: '7d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController, OtpAdminController],
  providers: [
    AuthService,
    OtpAdminService,
    JwtStrategy,
    RoleHierarchyService,
    DataScopeService,
    AuthorizationService,
    PermissionGuard,
    RolesGuard,
  ],
  exports: [
    JwtModule,
    JwtStrategy,
    PassportModule,
    DataScopeService,
    AuthorizationService,
    RoleHierarchyService,
    PermissionGuard,
    RolesGuard,
    AuthService,
    OtpAdminService,
  ],
})
export class AuthModule {}
