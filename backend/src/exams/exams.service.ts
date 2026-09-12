import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamQueryDto } from './dto/exam-query.dto';
import { Prisma } from '@prisma/client';

type ExamWithRelations = Prisma.ExamGetPayload<{
  include: {
    courses: {
      include: {
        course: {
          include: {
            college: {
              select: {
                id: true;
                name: true;
                city: true;
                state: true;
                university: true;
                logo: true;
              };
            };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD STATS
  // ─────────────────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();

    const [
      totalExams,
      upcomingExams,
      openRegistrations,
      closedRegistrations,
      resultsDeclared,
      featuredExams,
      nationalExams,
      stateExams,
      privateExams,
      latestExam,
    ] = await Promise.all([
      this.prisma.exam.count({ where: { status: { not: 'ARCHIVED' } } }),
      this.prisma.exam.count({
        where: { status: { not: 'ARCHIVED' }, examDate: { gt: now } },
      }),
      this.prisma.exam.count({
        where: {
          status: { not: 'ARCHIVED' },
          applicationStart: { lte: now },
          applicationEnd: { gte: now },
        },
      }),
      this.prisma.exam.count({
        where: {
          status: { not: 'ARCHIVED' },
          applicationEnd: { lt: now },
        },
      }),
      this.prisma.exam.count({
        where: {
          status: { not: 'ARCHIVED' },
          resultDate: { lte: now },
        },
      }),
      this.prisma.exam.count({
        where: { featured: true, status: { not: 'ARCHIVED' } },
      }),
      this.prisma.exam.count({
        where: { level: 'NATIONAL', status: { not: 'ARCHIVED' } },
      }),
      this.prisma.exam.count({
        where: { level: 'STATE', status: { not: 'ARCHIVED' } },
      }),
      this.prisma.exam.count({
        where: { level: 'PRIVATE', status: { not: 'ARCHIVED' } },
      }),
      this.prisma.exam.findFirst({
        where: { status: { not: 'ARCHIVED' } },
        orderBy: { createdAt: 'desc' },
        select: { examName: true, createdAt: true },
      }),
    ]);

    const mostApplied = await this.prisma.exam.findFirst({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { courses: { _count: 'desc' } },
      select: { examName: true },
    });

    const totalApps = await this.prisma.application.count();
    const averageApplications =
      totalExams > 0 ? Math.round(totalApps / totalExams) : 0;

    return {
      totalExams,
      upcomingExams,
      openRegistrations,
      closedRegistrations,
      resultsDeclared,
      featuredExams,
      nationalExams,
      stateExams,
      privateExams,
      mostAppliedExam: mostApplied?.examName ?? 'N/A',
      averageApplications,
      latestExam: latestExam?.examName ?? 'N/A',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND ALL (Paginated, Filtered, Searchable)
  // ─────────────────────────────────────────────────────────────────────────

  async findAll(query: ExamQueryDto) {
    const {
      q,
      page = 1,
      limit = 20,
      category,
      level,
      examMode,
      status,
      featured,
      registrationStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ExamWhereInput = {
      status: status ? status : { not: 'ARCHIVED' },
    };

    if (q) {
      where.OR = [
        { examName: { contains: q, mode: 'insensitive' } },
        { conductedBy: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { level: { contains: q, mode: 'insensitive' } },
        { eligibility: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (level) where.level = { equals: level, mode: 'insensitive' };
    if (examMode) where.examMode = { equals: examMode, mode: 'insensitive' };
    if (featured !== undefined) where.featured = featured === 'true';

    const now = new Date();
    if (registrationStatus === 'UPCOMING') {
      where.applicationStart = { gt: now };
    } else if (registrationStatus === 'OPEN') {
      where.applicationStart = { lte: now };
      where.applicationEnd = { gte: now };
    } else if (registrationStatus === 'CLOSED') {
      where.applicationEnd = { lt: now };
    } else if (registrationStatus === 'RESULTS') {
      where.resultDate = { lte: now };
    }

    const ORDER_FIELDS: Record<string, Prisma.ExamOrderByWithRelationInput> = {
      examName: { examName: sortOrder as Prisma.SortOrder },
      examDate: { examDate: sortOrder as Prisma.SortOrder },
      applicationStart: { applicationStart: sortOrder as Prisma.SortOrder },
      applicationEnd: { applicationEnd: sortOrder as Prisma.SortOrder },
      createdAt: { createdAt: sortOrder as Prisma.SortOrder },
    };
    const orderBy: Prisma.ExamOrderByWithRelationInput = ORDER_FIELDS[
      sortBy
    ] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          courses: {
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                  totalFees: true,
                  college: {
                    select: {
                      id: true,
                      name: true,
                      city: true,
                      state: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND BY ID
  // ─────────────────────────────────────────────────────────────────────────

  async findById(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        courses: {
          include: {
            course: {
              include: {
                college: true,
                _count: { select: { applications: true } },
              },
            },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    return exam;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  async create(dto: CreateExamDto, adminId: string) {
    const baseSlug = dto.examName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const slug = await this.generateUniqueSlug(baseSlug);

    const { courseIds, ...examFields } = dto;

    const exam = await this.prisma.exam.create({
      data: {
        ...examFields,
        slug,
        applicationStart: dto.applicationStart
          ? new Date(dto.applicationStart)
          : null,
        applicationEnd: dto.applicationEnd
          ? new Date(dto.applicationEnd)
          : null,
        examDate: dto.examDate ? new Date(dto.examDate) : null,
        resultDate: dto.resultDate ? new Date(dto.resultDate) : null,
        counsellingDate: dto.counsellingDate
          ? new Date(dto.counsellingDate)
          : null,
        status: dto.status ?? 'PUBLISHED',
        featured: dto.featured ?? false,
      },
    });

    if (courseIds && courseIds.length > 0) {
      await this.prisma.courseExam.createMany({
        data: courseIds.map((courseId) => ({
          examId: exam.id,
          courseId,
        })),
        skipDuplicates: true,
      });
    }

    await this.auditService.logAction({
      userId: adminId,
      action: 'CREATE_EXAM',
      entity: 'Exam',
      entityId: exam.id,
      newValue: {
        examName: exam.examName,
        category: exam.category,
        level: exam.level,
      },
    });

    return this.findById(exam.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateExamDto, adminId: string) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    const { courseIds, ...examFields } = dto;

    const updateData: Prisma.ExamUpdateInput = {
      ...(examFields.examName && { examName: examFields.examName }),
      ...(examFields.category && { category: examFields.category }),
      ...(examFields.level && { level: examFields.level }),
      ...(examFields.conductedBy !== undefined && {
        conductedBy: examFields.conductedBy,
      }),
      ...(examFields.eligibility !== undefined && {
        eligibility: examFields.eligibility,
      }),
      ...(examFields.qualification !== undefined && {
        qualification: examFields.qualification,
      }),
      ...(examFields.ageLimit !== undefined && {
        ageLimit: examFields.ageLimit,
      }),
      ...(examFields.examMode !== undefined && {
        examMode: examFields.examMode,
      }),
      ...(examFields.syllabus !== undefined && {
        syllabus: examFields.syllabus,
      }),
      ...(examFields.pattern !== undefined && { pattern: examFields.pattern }),
      ...(examFields.totalMarks !== undefined && {
        totalMarks: examFields.totalMarks,
      }),
      ...(examFields.duration !== undefined && {
        duration: examFields.duration,
      }),
      ...(examFields.applicationFee !== undefined && {
        applicationFee: examFields.applicationFee,
      }),
      ...(examFields.officialWebsite !== undefined && {
        officialWebsite: examFields.officialWebsite,
      }),
      ...(examFields.preparationTips !== undefined && {
        preparationTips: examFields.preparationTips,
      }),
      ...(examFields.importantBooks !== undefined && {
        importantBooks: examFields.importantBooks,
      }),
      ...(examFields.previousYearPapers !== undefined && {
        previousYearPapers: examFields.previousYearPapers,
      }),
      ...(examFields.faqs !== undefined && { faqs: examFields.faqs }),
      ...(examFields.seoTitle !== undefined && {
        seoTitle: examFields.seoTitle,
      }),
      ...(examFields.seoDescription !== undefined && {
        seoDescription: examFields.seoDescription,
      }),
      ...(examFields.featured !== undefined && {
        featured: examFields.featured,
      }),
      ...(examFields.status !== undefined && { status: examFields.status }),
      ...(examFields.applicationStart !== undefined && {
        applicationStart: examFields.applicationStart
          ? new Date(examFields.applicationStart)
          : null,
      }),
      ...(examFields.applicationEnd !== undefined && {
        applicationEnd: examFields.applicationEnd
          ? new Date(examFields.applicationEnd)
          : null,
      }),
      ...(examFields.examDate !== undefined && {
        examDate: examFields.examDate ? new Date(examFields.examDate) : null,
      }),
      ...(examFields.resultDate !== undefined && {
        resultDate: examFields.resultDate
          ? new Date(examFields.resultDate)
          : null,
      }),
      ...(examFields.counsellingDate !== undefined && {
        counsellingDate: examFields.counsellingDate
          ? new Date(examFields.counsellingDate)
          : null,
      }),
    };

    const updated = await this.prisma.exam.update({
      where: { id },
      data: updateData,
    });

    if (courseIds !== undefined) {
      await this.prisma.courseExam.deleteMany({ where: { examId: id } });
      if (courseIds.length > 0) {
        await this.prisma.courseExam.createMany({
          data: courseIds.map((courseId) => ({
            examId: id,
            courseId,
          })),
          skipDuplicates: true,
        });
      }
    }

    await this.auditService.logAction({
      userId: adminId,
      action: 'UPDATE_EXAM',
      entity: 'Exam',
      entityId: id,
      oldValue: { examName: existing.examName, status: existing.status },
      newValue: { examName: updated.examName, status: updated.status },
    });

    return this.findById(id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────────────────

  async softDelete(id: string, adminId: string) {
    const existing = await this.prisma.exam.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    await this.prisma.exam.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'DELETE_EXAM',
      entity: 'Exam',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: 'ARCHIVED' },
    });

    return { message: 'Exam archived successfully', id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────────────────────────────────

  async getExportData(query: ExamQueryDto): Promise<ExamWithRelations[]> {
    const result = await this.findAll({ ...query, page: 1, limit: 10000 });
    return result.data as any;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async generateUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (await this.prisma.exam.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    return slug;
  }
}
