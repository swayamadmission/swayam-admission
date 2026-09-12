import {
  Controller,
  Patch,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdmissionWorkflowService } from './admission-workflow.service';
import { UpdateStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';
import type { Request } from 'express';

@Controller('admission-workflow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdmissionWorkflowController {
  constructor(
    private readonly admissionWorkflowService: AdmissionWorkflowService,
  ) {}

  @Patch(':applicationId/stage')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  updateStage(
    @Req() req: Request,
    @Param('applicationId') applicationId: string,
    @Body() dto: UpdateStageDto,
    @CurrentUser() user: IUser,
  ) {
    return this.admissionWorkflowService.updateStage(
      applicationId,
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get(':applicationId/timeline')
  getTimeline(@Param('applicationId') applicationId: string) {
    return this.admissionWorkflowService.getTimeline(applicationId);
  }
}
