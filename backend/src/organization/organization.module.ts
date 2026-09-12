import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RolesModule } from '../roles/roles.module';
import { AuthModule } from '../auth/auth.module';
import { DepartmentsService } from './departments.service';
import { UnitsService } from './units.service';
import { GeographyService } from './geography.service';
import { OrganizationController } from './organization.controller';
import { GeographyPublicController } from './geography.public.controller';

@Module({
  imports: [PrismaModule, AuditModule, RolesModule, AuthModule],
  controllers: [OrganizationController, GeographyPublicController],
  providers: [DepartmentsService, UnitsService, GeographyService],
  exports: [DepartmentsService, UnitsService, GeographyService],
})
export class OrganizationModule {}
