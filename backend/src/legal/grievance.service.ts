import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SubmitGrievanceDto, UpdateGrievanceDto } from './dto/legal-policy.dto';

@Injectable()
export class GrievanceService {
  private readonly logger = new Logger(GrievanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Submit new student / public grievance
   */
  async submitGrievance(dto: SubmitGrievanceDto, actorUser?: any) {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const complaintId = `GRV-${year}-${randomSuffix}`;

    let userId = actorUser?.id;
    if (!userId) {
      // If submitted unauthenticated, check if user exists by email/mobile or assign to system
      if (dto.email || dto.mobile) {
        const existing = await this.prisma.user.findFirst({
          where: {
            OR: [
              ...(dto.email ? [{ email: dto.email }] : []),
              ...(dto.mobile ? [{ mobile: dto.mobile }] : []),
            ],
          },
          select: { id: true },
        });
        if (existing) userId = existing.id;
      }

      if (!userId) {
        // Fallback to system admin user for unauthenticated public grievance
        const adminUser = await this.prisma.user.findFirst({
          where: { role: 'SUPER_ADMIN' },
          select: { id: true },
        });
        userId = adminUser?.id;
      }
    }

    if (!userId) {
      throw new BadRequestException('A valid user account could not be associated with this grievance.');
    }

    const grievance = await this.prisma.grievance.create({
      data: {
        complaintId,
        userId,
        category: dto.category,
        subject: dto.subject,
        description: dto.description,
        status: 'SUBMITTED',
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
      },
    });

    await this.auditService.logAction({
      module: 'GRIEVANCE',
      action: 'GRIEVANCE_SUBMITTED',
      entityId: grievance.id,
      entityType: 'Grievance',
      entityName: grievance.complaintId,
      userId: actorUser?.id || userId,
      userName: actorUser?.fullName || dto.fullName,
      metadata: { complaintId: grievance.complaintId, category: grievance.category },
    });

    return grievance;
  }

  /**
   * Admin: List all grievances with filters
   */
  async getAllGrievances(params: {
    status?: string;
    category?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};
    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }
    if (params.category && params.category !== 'ALL') {
      where.category = params.category;
    }
    if (params.search) {
      where.OR = [
        { complaintId: { contains: params.search, mode: 'insensitive' } },
        { subject: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { user: { fullName: { contains: params.search, mode: 'insensitive' } } },
        { user: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const skip = Number(params.skip) || 0;
    const take = Number(params.take) || 25;

    const [total, items] = await Promise.all([
      this.prisma.grievance.count({ where }),
      this.prisma.grievance.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, mobile: true },
          },
          assignedTo: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
    ]);

    return { total, skip, take, items };
  }

  /**
   * Admin: Get grievance by ID
   */
  async getGrievanceById(id: string) {
    const grievance = await this.prisma.grievance.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!grievance) {
      throw new NotFoundException(`Grievance with ID ${id} not found`);
    }

    return grievance;
  }

  /**
   * Admin: Update / Resolve Grievance
   */
  async updateGrievance(id: string, dto: UpdateGrievanceDto, actorUser?: any) {
    const existing = await this.getGrievanceById(id);

    const isNowResolved = dto.status === 'RESOLVED' || dto.status === 'CLOSED';
    const resolvedAt = isNowResolved && !existing.resolvedAt ? new Date() : existing.resolvedAt;

    const updated = await this.prisma.grievance.update({
      where: { id },
      data: {
        status: dto.status ?? existing.status,
        assignedToId: dto.assignedToId ?? existing.assignedToId,
        response: dto.response ?? existing.response,
        resolution: dto.resolution ?? existing.resolution,
        resolvedAt,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, mobile: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.auditService.logAction({
      module: 'GRIEVANCE',
      action: isNowResolved ? 'GRIEVANCE_RESOLVED' : 'GRIEVANCE_UPDATED',
      entityId: updated.id,
      entityType: 'Grievance',
      entityName: updated.complaintId,
      userId: actorUser?.id,
      userName: actorUser?.fullName,
      metadata: { complaintId: updated.complaintId, status: updated.status },
    });

    return updated;
  }
}
