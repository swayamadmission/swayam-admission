import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleHierarchyService } from './role-hierarchy.service';
import { GovernanceService } from './governance.service';
import { RolesController } from './roles.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RolesController],
  providers: [RolesService, RoleHierarchyService, GovernanceService],
  exports: [RolesService, RoleHierarchyService, GovernanceService],
})
export class RolesModule {}
