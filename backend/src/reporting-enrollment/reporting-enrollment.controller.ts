import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportingEnrollmentService } from './reporting-enrollment.service';
import {
  SubmitReportingDto,
  RequestReportingCorrectionDto,
  VerifyReportingDto,
  ConfirmEnrollmentDto,
} from './dto/reporting-enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('reporting-enrollment')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportingEnrollmentController {
  constructor(
    private readonly reportingEnrollmentService: ReportingEnrollmentService,
  ) {}

  @Get('application/:applicationId')
  getReportingByApplicationId(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: IUser,
  ) {
    return this.reportingEnrollmentService.getReportingByApplicationId(
      applicationId,
      user,
    );
  }

  @Post('application/:applicationId/submit')
  submitReporting(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: IUser,
    @Body() dto: SubmitReportingDto,
  ) {
    return this.reportingEnrollmentService.submitReporting(
      user,
      applicationId,
      dto,
    );
  }

  @Get('queue')
  @Permissions('application.view')
  getReportingQueue(@CurrentUser() user: IUser, @Query() query: any) {
    return this.reportingEnrollmentService.getReportingQueue(user, query);
  }

  @Post(':id/claim')
  @Permissions('application.edit')
  claimReporting(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.reportingEnrollmentService.claimReporting(user, id);
  }

  @Post(':id/request-correction')
  @Permissions('application.edit')
  requestReportingCorrection(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: RequestReportingCorrectionDto,
  ) {
    return this.reportingEnrollmentService.requestReportingCorrection(
      user,
      id,
      dto,
    );
  }

  @Post(':id/verify')
  @Permissions('application.edit')
  verifyReporting(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: VerifyReportingDto,
  ) {
    return this.reportingEnrollmentService.verifyReporting(user, id, dto);
  }

  @Post('application/:applicationId/confirm-enrollment')
  @Permissions('application.edit')
  confirmEnrollment(
    @Param('applicationId') applicationId: string,
    @CurrentUser() user: IUser,
    @Body() dto: ConfirmEnrollmentDto,
  ) {
    return this.reportingEnrollmentService.confirmEnrollment(
      user,
      applicationId,
      dto,
    );
  }

  @Get('student/:studentId/enrollments')
  getStudentEnrollments(
    @Param('studentId') studentId: string,
    @CurrentUser() user: IUser,
  ) {
    return this.reportingEnrollmentService.getStudentEnrollments(
      studentId,
      user,
    );
  }
}
