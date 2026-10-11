import { Module, Global } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
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

@Global()
@Module({
  imports: [
    PrismaModule,
    LegalModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'swayam_super_secret_key',
        signOptions: {
          expiresIn: '7d',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
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
  ],
})
export class AuthModule {}
