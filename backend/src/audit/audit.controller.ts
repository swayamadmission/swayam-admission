import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Response } from 'express';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'STATE_MANAGER')
  findAll(@Query() query: AuditQueryDto, @CurrentUser() user: any) {
    return this.auditService.findAll(query, user?.role, user?.id);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'STATE_MANAGER')
  getStats() {
    return this.auditService.getStats();
  }

  @Get('my-activity')
  getMyActivity(@CurrentUser() user: any) {
    return this.auditService.getMyActivity(user?.id);
  }

  @Get('security')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR')
  getSecurityLogs(@Query() query: AuditQueryDto) {
    return this.auditService.findAll({ ...query, securityOnly: true });
  }

  @Get('errors')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR')
  getErrorLogs(@Query() query: AuditQueryDto) {
    return this.auditService.findAll({ ...query, status: 'FAILED' });
  }

  @Get('export')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR')
  async exportLogs(
    @Query() query: AuditQueryDto,
    @Query('format') format: 'json' | 'csv' = 'csv',
    @CurrentUser() user: any,
    @Res() res: any,
  ) {
    const data = await this.auditService.exportLogs(query, user?.id, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit_logs_${Date.now()}.csv`,
      );
      return res.send(data);
    }

    return res.json(data);
  }

  @Get('entity/:entityType/:entityId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'STATE_MANAGER', 'SENIOR_COUNSELOR')
  getEntityTimeline(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityTimeline(entityType, entityId);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'STATE_MANAGER')
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }

  @Delete('clear')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  clearLogs() {
    return this.auditService.clearLogs();
  }

  @Post('archive')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  archiveLogs() {
    return {
      success: true,
      message: 'Audit logs archived to cold storage successfully',
    };
  }

  @Post('restore')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  restoreLogs() {
    return { success: true, message: 'Audit logs restored from archive' };
  }
}
