import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateStageDto } from './dto/update-stage.dto';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class AdmissionWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async updateStage(
    applicationId: string,
    dto: UpdateStageDto,
    actionBy: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const updatedApp = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: dto.status,
        remarks: dto.remarks || application.remarks,
        // Optional: you could update dates based on status, e.g. approvedDate, rejectedDate
        approvedDate:
          dto.status === ApplicationStatus.APPROVED
            ? new Date()
            : application.approvedDate,
        rejectedDate:
          dto.status === ApplicationStatus.REJECTED
            ? new Date()
            : application.rejectedDate,
      },
    });

    // Create Timeline entry
    await this.prisma.applicationTimeline.create({
      data: {
        applicationId,
        userId: actionBy,
        action: 'STAGE_CHANGED',
        oldStatus: application.status,
        newStatus: dto.status,
        remarks: dto.remarks,
      },
    });

    // Audit log
    await this.audit.logAction({
      userId: actionBy,
      action: 'UPDATE_APPLICATION_STAGE',
      entity: 'Application',
      entityId: applicationId,
      oldValue: { status: application.status },
      newValue: { status: dto.status },
      ipAddress,
      userAgent,
    });

    return updatedApp;
  }

  async getTimeline(applicationId: string) {
    return this.prisma.applicationTimeline.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
    });
  }
}
