import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCourseDto, UpdateCourseDto } from './course.dto';
import {
  Prisma,
  CollegeStatus,
  CourseCategory,
  CourseLevel,
  CourseMode,
  CourseDurationType,
} from '@prisma/client';

// Full course shape returned by include queries
type CourseWithRelations = Prisma.CourseGetPayload<{
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
    _count: { select: { applications: true } };
  };
}>;

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // STREAMS & DISCIPLINES BY EDUCATION LEVEL
  // ─────────────────────────────────────────────────────────────────────────

  async getStreamsByEducationLevel(educationLevel?: string): Promise<string[]> {
    const lvl = (educationLevel || '').trim().toLowerCase();

    if (lvl === '10th') {
      return ['General / All Subjects', 'Matriculation', 'Not Applicable'];
    }

    if (lvl === '12th') {
      return [
        'Science - PCM',
        'Science - PCB',
        'Science - PCMB',
        'Commerce',
        'Arts / Humanities',
        'Vocational',
        'Other',
      ];
    }

    if (lvl === 'diploma') {
      const diplomaCourses = await this.prisma.course.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          OR: [
            { level: 'DIPLOMA' },
            { name: { contains: 'Diploma', mode: 'insensitive' } },
            { name: { contains: 'Polytechnic', mode: 'insensitive' } },
          ],
        },
        include: { branches: true },
      });

      const streamSet = new Set<string>();
      for (const c of diplomaCourses) {
        if (c.branches && c.branches.length > 0) {
          for (const b of c.branches) {
            streamSet.add(b.name);
          }
        }
        const match = c.name.match(/Diploma in (.+)/i);
        if (match && match[1]) {
          streamSet.add(match[1].trim());
        }
      }

      const standardDiplomaDisciplines = [
        'Computer Science & Engineering',
        'Mechanical Engineering',
        'Civil Engineering',
        'Electrical Engineering',
        'Electronics & Communication',
        'Information Technology',
        'Pharmacy (D.Pharm)',
        'Medical Laboratory Technology (DMLT)',
        'Fashion Design & Garment Technology',
        'Management Studies',
        'Other Diploma',
      ];
      for (const s of standardDiplomaDisciplines) {
        streamSet.add(s);
      }

      return Array.from(streamSet);
    }

    if (lvl === 'undergraduate') {
      return [
        'Engineering & Technology (B.Tech / BE)',
        'Computer Applications (BCA / B.Sc IT)',
        'Business Administration (BBA)',
        'Commerce (B.Com)',
        'Science (B.Sc)',
        'Arts & Humanities (BA)',
        'Pharmacy (B.Pharm)',
        'Law (LLB / BA LLB)',
        'Nursing & Healthcare',
        'Other Undergraduate',
      ];
    }

    if (lvl === 'postgraduate') {
      return [
        'Engineering (M.Tech)',
        'Management (MBA / PGDM)',
        'Computer Applications (MCA)',
        'Commerce (M.Com)',
        'Science (M.Sc)',
        'Arts (MA)',
        'Pharmacy (M.Pharm)',
        'Law (LLM)',
        'Doctoral / Ph.D',
        'Other Postgraduate',
      ];
    }

    return [
      'Science',
      'Commerce',
      'Arts',
      'Engineering',
      'Computer & IT',
      'Management',
      'Pharmacy',
      'Vocational',
      'Other',
    ];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD STATS
  // ─────────────────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalCourses,
      activeCourses,
      featuredCourses,
      totalApplications,
      feesAgg,
    ] = await Promise.all([
      this.prisma.course.count({ where: { status: { not: 'ARCHIVED' } } }),
      this.prisma.course.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.course.count({
        where: { featured: true, status: { not: 'ARCHIVED' } },
      }),
      this.prisma.application.count({
        where: { course: { status: { not: 'ARCHIVED' } } },
      }),
      this.prisma.course.aggregate({
        _avg: { totalFees: true },
        _max: { totalFees: true },
        _min: { totalFees: true },
        where: { status: { not: 'ARCHIVED' }, totalFees: { gt: 0 } },
      }),
    ]);

    const collegesOffering = await this.prisma.college.count({
      where: { courses: { some: { status: { not: 'ARCHIVED' } } } },
    });

    const mostPopular = await this.prisma.course.findFirst({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { applications: { _count: 'desc' } },
      select: { id: true, name: true, category: true },
    });

    const streamGroups = await this.prisma.course.groupBy({
      by: ['category'],
      where: { status: { not: 'ARCHIVED' } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });

    return {
      totalCourses,
      activeCourses,
      featuredCourses,
      totalApplications,
      collegesOffering,
      averageFee: Math.round(feesAgg._avg.totalFees ?? 0),
      highestFee: feesAgg._max.totalFees ?? 0,
      lowestFee: feesAgg._min.totalFees ?? 0,
      mostPopularCourse: mostPopular?.name ?? null,
      topCategory: streamGroups[0]?.category ?? null,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LIST
  // ─────────────────────────────────────────────────────────────────────────

  async findAll(filters: {
    q?: string;
    page?: number;
    limit?: number;
    category?: string;
    level?: string;
    mode?: string;
    collegeId?: string;
    state?: string;
    status?: string;
    featured?: boolean;
    educationLevel?: string;
    stream?: string;
    entryType?: string;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const {
      q,
      page = 1,
      limit = 20,
      category,
      level,
      mode,
      collegeId,
      state,
      status,
      featured,
      educationLevel,
      stream,
      entryType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.CourseWhereInput = {
      status: status
        ? status === 'ACTIVE' || status === 'PUBLISHED'
          ? { in: [CollegeStatus.PUBLISHED, CollegeStatus.ACTIVE] }
          : (status as CollegeStatus)
        : { not: CollegeStatus.ARCHIVED },
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { eligibility: { contains: q, mode: 'insensitive' } },
        { careerScope: { contains: q, mode: 'insensitive' } },
        { college: { name: { contains: q, mode: 'insensitive' } } },
        { college: { university: { contains: q, mode: 'insensitive' } } },
        { college: { state: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (category) where.category = category as CourseCategory;
    if (level) where.level = level as CourseLevel;
    if (mode) where.mode = mode as CourseMode;
    if (collegeId) where.collegeId = collegeId;
    if (state) {
      where.college = { state: { equals: state, mode: 'insensitive' } };
    }
    if (featured !== undefined) where.featured = featured;

    if (educationLevel) {
      const levelConditions: Prisma.CourseWhereInput[] = [
        {
          eligibilities: {
            some: {
              educationLevel: { equals: educationLevel, mode: 'insensitive' },
              ...(entryType
                ? { entryType: { equals: entryType, mode: 'insensitive' } }
                : {}),
              status: 'ACTIVE',
            },
          },
        },
        {
          eligibleLevels: {
            has: educationLevel,
          },
        },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: levelConditions },
        ];
        delete where.OR;
      } else {
        where.OR = levelConditions;
      }
    }

    if (stream && stream !== 'Not Applicable' && stream !== 'Other' && stream !== 'ALL_STREAMS') {
      const streamCondition: Prisma.CourseWhereInput = {
        OR: [
          {
            eligibilities: {
              some: {
                OR: [
                  { stream: { equals: stream, mode: 'insensitive' } },
                  { stream: null },
                ],
                ...(educationLevel
                  ? { educationLevel: { equals: educationLevel, mode: 'insensitive' } }
                  : {}),
                status: 'ACTIVE',
              },
            },
          },
          {
            eligibleStreams: {
              isEmpty: true,
            },
          },
          {
            eligibleStreams: {
              has: stream,
            },
          },
        ],
      };

      if (where.AND) {
        if (Array.isArray(where.AND)) {
          where.AND.push(streamCondition);
        } else {
          where.AND = [where.AND, streamCondition];
        }
      } else {
        where.AND = [streamCondition];
      }
    }

    const ORDER_FIELDS: Record<string, Prisma.CourseOrderByWithRelationInput> =
      {
        name: { name: sortOrder as Prisma.SortOrder },
        totalFees: { totalFees: sortOrder as Prisma.SortOrder },
        seats: { seats: sortOrder as Prisma.SortOrder },
        createdAt: { createdAt: sortOrder as Prisma.SortOrder },
        averageSalary: { averageSalary: sortOrder as Prisma.SortOrder },
      };
    const orderBy: Prisma.CourseOrderByWithRelationInput = ORDER_FIELDS[
      sortBy
    ] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          college: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              university: true,
              logo: true,
            },
          },
          eligibilities: true,
          _count: { select: { applications: true, branches: true } },
        },
      }),
      this.prisma.course.count({ where }),
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
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            university: true,
            logo: true,
            website: true,
            phone: true,
            email: true,
            naacGrade: true,
            accreditation: true,
            approvals: true,
          },
        },
        branches: {
          where: { status: { not: 'ARCHIVED' } },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            courseId: true,
            name: true,
            code: true,
            slug: true,
            type: true,
            eligibility: true,
            status: true,
            order: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        eligibilities: {
          where: { status: 'ACTIVE' },
        },
        applications: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            applicationId: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
              },
            },
          },
        },
        _count: { select: { applications: true, branches: true } },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }

    return course;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  async create(dto: CreateCourseDto, adminId: string) {
    const college = await this.prisma.college.findUnique({
      where: { id: dto.collegeId },
      select: { id: true, name: true },
    });
    if (!college) {
      throw new NotFoundException(`College with id ${dto.collegeId} not found`);
    }

    const baseSlug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const slug = await this.generateUniqueSlug(baseSlug, dto.collegeId);

    const eligibleLevels = dto.eligibleLevels ?? [];
    const eligibleStreams = dto.eligibleStreams ?? [];

    const course = await this.prisma.course.create({
      data: {
        collegeId: dto.collegeId,
        name: dto.name,
        slug,
        category: dto.category ?? CourseCategory.OTHER,
        level: dto.level ?? CourseLevel.UG,
        duration: dto.duration ?? '1',
        durationType: dto.durationType ?? CourseDurationType.YEARS,
        mode: dto.mode ?? CourseMode.FULL_TIME,
        featured: dto.featured ?? false,
        status: dto.status ?? CollegeStatus.DRAFT,
        eligibleLevels,
        eligibleStreams,
        description: dto.description,
        eligibility: dto.eligibility,
        entranceExam: dto.entranceExam,
        seats: dto.seats,
        syllabus: dto.syllabus ?? [],
        totalFees: dto.totalFees,
        semesterFees: dto.semesterFees,
        careerScope: dto.careerScope,
        averageSalary: dto.averageSalary,
        ...(eligibleLevels.length > 0
          ? {
              eligibilities: {
                create: eligibleLevels.map((lvl) => ({
                  educationLevel: lvl,
                  stream:
                    eligibleStreams.length === 1 ? eligibleStreams[0] : null,
                  entryType: lvl === 'Diploma' ? 'LATERAL' : 'DIRECT',
                  lateralEntry: lvl === 'Diploma',
                  status: 'ACTIVE',
                })),
              },
            }
          : {}),
      },
      include: {
        college: { select: { id: true, name: true } },
        eligibilities: true,
      },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'CREATE_COURSE',
      entity: 'Course',
      entityId: course.id,
      newValue: { name: course.name, collegeId: course.collegeId },
    });

    return course;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCourseDto, adminId: string) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }

    if (dto.collegeId && dto.collegeId !== existing.collegeId) {
      const college = await this.prisma.college.findUnique({
        where: { id: dto.collegeId },
        select: { id: true },
      });
      if (!college) {
        throw new NotFoundException(
          `College with id ${dto.collegeId} not found`,
        );
      }
    }

    const updateData: Prisma.CourseUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.collegeId !== undefined)
      updateData.college = { connect: { id: dto.collegeId } };
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.level !== undefined) updateData.level = dto.level;
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.durationType !== undefined)
      updateData.durationType = dto.durationType;
    if (dto.mode !== undefined) updateData.mode = dto.mode;
    if (dto.featured !== undefined) updateData.featured = dto.featured;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.eligibleLevels !== undefined)
      updateData.eligibleLevels = dto.eligibleLevels;
    if (dto.eligibleStreams !== undefined)
      updateData.eligibleStreams = dto.eligibleStreams;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.eligibility !== undefined) updateData.eligibility = dto.eligibility;
    if (dto.entranceExam !== undefined)
      updateData.entranceExam = dto.entranceExam;
    if (dto.seats !== undefined) updateData.seats = dto.seats;
    if (dto.syllabus !== undefined) updateData.syllabus = dto.syllabus;
    if (dto.totalFees !== undefined) updateData.totalFees = dto.totalFees;
    if (dto.semesterFees !== undefined)
      updateData.semesterFees = dto.semesterFees;
    if (dto.careerScope !== undefined) updateData.careerScope = dto.careerScope;
    if (dto.averageSalary !== undefined)
      updateData.averageSalary = dto.averageSalary;

    if (dto.eligibleLevels !== undefined) {
      // Sync relational CourseEligibility
      await this.prisma.courseEligibility.deleteMany({ where: { courseId: id } });
      if (dto.eligibleLevels.length > 0) {
        const streams = dto.eligibleStreams ?? existing.eligibleStreams ?? [];
        await this.prisma.courseEligibility.createMany({
          data: dto.eligibleLevels.map((lvl) => ({
            courseId: id,
            educationLevel: lvl,
            stream: streams.length === 1 ? streams[0] : null,
            entryType: lvl === 'Diploma' ? 'LATERAL' : 'DIRECT',
            lateralEntry: lvl === 'Diploma',
            status: 'ACTIVE',
          })),
        });
      }
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        college: { select: { id: true, name: true } },
        eligibilities: true,
      },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'UPDATE_COURSE',
      entity: 'Course',
      entityId: id,
      oldValue: { name: existing.name, status: existing.status },
      newValue: { name: updated.name, status: updated.status },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────────────────

  async softDelete(id: string, adminId: string) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Course with id ${id} not found`);
    }

    await this.prisma.course.update({
      where: { id },
      data: { status: CollegeStatus.ARCHIVED },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'DELETE_COURSE',
      entity: 'Course',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: CollegeStatus.ARCHIVED },
    });

    return { message: 'Course archived successfully', id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BRANCH / SPECIALIZATION MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  async getBranchesForCourse(courseId: string, status?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, name: true, status: true, allowOtherBranch: true },
    });
    if (!course) {
      throw new NotFoundException(`Course not found with ID ${courseId}`);
    }

    const whereClause: Prisma.CourseBranchWhereInput = {
      courseId,
      ...(status ? { status } : { status: 'ACTIVE' }),
    };

    const branches = await this.prisma.courseBranch.findMany({
      where: whereClause,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        courseId: true,
        name: true,
        code: true,
        slug: true,
        type: true,
        eligibility: true,
        status: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: branches,
      total: branches.length,
      allowOtherBranch: course.allowOtherBranch,
    };
  }

  async createBranch(
    courseId: string,
    dto: {
      name: string;
      code?: string;
      slug?: string;
      type?: string;
      eligibility?: string;
      status?: string;
      order?: number;
    },
    userId: string,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course not found with ID ${courseId}`);
    }

    const baseSlug =
      dto.slug ||
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (
      await this.prisma.courseBranch.findUnique({
        where: { courseId_slug: { courseId, slug } },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    const branch = await this.prisma.courseBranch.create({
      data: {
        courseId,
        name: dto.name,
        code: dto.code || null,
        slug,
        type: dto.type || 'BRANCH',
        eligibility: dto.eligibility || null,
        status: dto.status || 'ACTIVE',
        order: dto.order ?? 0,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'CREATE_BRANCH',
      entity: 'CourseBranch',
      entityId: branch.id,
      entityName: `${branch.name} (${course.name})`,
      module: 'COURSES',
      newValue: branch,
    });

    return branch;
  }

  async updateBranch(
    courseId: string,
    branchId: string,
    dto: {
      name?: string;
      code?: string;
      slug?: string;
      type?: string;
      eligibility?: string;
      status?: string;
      order?: number;
    },
    userId: string,
  ) {
    const branch = await this.prisma.courseBranch.findFirst({
      where: { id: branchId, courseId },
    });
    if (!branch) {
      throw new NotFoundException(
        `Branch not found with ID ${branchId} for course ${courseId}`,
      );
    }

    const updated = await this.prisma.courseBranch.update({
      where: { id: branchId },
      data: {
        name: dto.name ?? undefined,
        code: dto.code ?? undefined,
        slug: dto.slug ?? undefined,
        type: dto.type ?? undefined,
        eligibility: dto.eligibility ?? undefined,
        status: dto.status ?? undefined,
        order: dto.order ?? undefined,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'UPDATE_BRANCH',
      entity: 'CourseBranch',
      entityId: branch.id,
      entityName: updated.name,
      module: 'COURSES',
      oldValue: branch,
      newValue: updated,
    });

    return updated;
  }

  async setBranchStatus(
    courseId: string,
    branchId: string,
    status: string,
    userId: string,
  ) {
    return this.updateBranch(courseId, branchId, { status }, userId);
  }

  async deleteBranch(courseId: string, branchId: string, userId: string) {
    const branch = await this.prisma.courseBranch.findFirst({
      where: { id: branchId, courseId },
      include: {
        _count: {
          select: { leads: true, applications: true },
        },
      },
    });
    if (!branch) {
      throw new NotFoundException(
        `Branch not found with ID ${branchId} for course ${courseId}`,
      );
    }

    if (branch._count.leads > 0 || branch._count.applications > 0) {
      throw new NotFoundException(
        `Cannot delete branch "${branch.name}" because it has ${branch._count.leads} lead(s) and ${branch._count.applications} application(s). Please set its status to ARCHIVED or DISABLED instead.`,
      );
    }

    const deleted = await this.prisma.courseBranch.delete({
      where: { id: branchId },
    });

    await this.auditService.logAction({
      userId,
      action: 'DELETE_BRANCH',
      entity: 'CourseBranch',
      entityId: branchId,
      entityName: deleted.name,
      module: 'COURSES',
      oldValue: deleted,
    });

    return { message: 'Branch deleted successfully' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT (all matching records)
  // ─────────────────────────────────────────────────────────────────────────

  async getExportData(
    filters: Parameters<typeof this.findAll>[0],
  ): Promise<CourseWithRelations[]> {
    const result = await this.findAll({ ...filters, page: 1, limit: 10000 });
    return result.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async generateUniqueSlug(
    base: string,
    collegeId: string,
  ): Promise<string> {
    const suffix = collegeId.slice(-6);
    let slug = `${base}-${suffix}`;
    let counter = 1;

    while (await this.prisma.course.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix}-${counter}`;
      counter++;
    }

    return slug;
  }
}
