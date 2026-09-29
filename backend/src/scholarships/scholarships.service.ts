import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateScholarshipDto } from './dto/create-scholarship.dto';
import { UpdateScholarshipDto } from './dto/update-scholarship.dto';
import { ScholarshipQueryDto } from './dto/scholarship-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ScholarshipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD STATS
  // ─────────────────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    const [
      totalScholarships,
      activeScholarships,
      featuredScholarships,
      expiringSoon,
      providersGroup,
    ] = await Promise.all([
      this.prisma.scholarship.count({ where: { status: { not: 'ARCHIVED' } } }),
      this.prisma.scholarship.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.scholarship.count({
        where: { featured: true, status: { not: 'ARCHIVED' } },
      }),
      this.prisma.scholarship.count({
        where: {
          status: { not: 'ARCHIVED' },
          applicationEnd: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      this.prisma.scholarship.groupBy({
        by: ['provider'],
        where: { status: { not: 'ARCHIVED' }, provider: { not: null } },
      }),
    ]);

    const totalApplications = await this.prisma.application.count();
    const totalProviders = providersGroup.length;

    return {
      totalScholarships,
      activeScholarships,
      featuredScholarships,
      expiringSoon,
      totalApplications,
      totalProviders,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND ALL
  // ─────────────────────────────────────────────────────────────────────────

  async findAll(query: ScholarshipQueryDto) {
    const {
      q,
      page = 1,
      limit = 20,
      category,
      scholarshipType,
      provider,
      state,
      status,
      featured,
      expiringSoon,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ScholarshipWhereInput = {
      status: status ? status : { not: 'ARCHIVED' },
    };

    if (q) {
      where.OR = [
        { scholarshipName: { contains: q, mode: 'insensitive' } },
        { provider: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { eligibility: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (scholarshipType)
      where.scholarshipType = { equals: scholarshipType, mode: 'insensitive' };
    if (provider) where.provider = { contains: provider, mode: 'insensitive' };
    if (state || query.stateId) {
      const stateConditions: Prisma.ScholarshipWhereInput[] = [];
      if (state) {
        stateConditions.push(
          { state: { equals: state, mode: 'insensitive' } },
          { states: { has: state } },
          { stateRelation: { name: { equals: state, mode: 'insensitive' } } },
        );
      }
      if (query.stateId) {
        stateConditions.push({ stateId: query.stateId });
      }
      where.AND = [
        ...(where.AND ? (Array.isArray(where.AND) ? where.AND : [where.AND]) : []),
        { OR: stateConditions },
      ];
    }
    if (featured !== undefined) where.featured = featured === 'true';

    const now = new Date();
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
      where.applicationEnd = { gte: now, lte: thirtyDaysFromNow };
    }

    const ORDER_FIELDS: Record<
      string,
      Prisma.ScholarshipOrderByWithRelationInput
    > = {
      scholarshipName: { scholarshipName: sortOrder as Prisma.SortOrder },
      amount: { amount: sortOrder as Prisma.SortOrder },
      applicationEnd: { applicationEnd: sortOrder as Prisma.SortOrder },
      createdAt: { createdAt: sortOrder as Prisma.SortOrder },
    };
    const orderBy: Prisma.ScholarshipOrderByWithRelationInput = ORDER_FIELDS[
      sortBy
    ] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.scholarship.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          stateRelation: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      this.prisma.scholarship.count({ where }),
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
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id },
    });

    if (!scholarship) {
      throw new NotFoundException(`Scholarship with ID ${id} not found`);
    }

    return scholarship;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  async create(dto: CreateScholarshipDto, adminId: string) {
    const baseSlug = dto.scholarshipName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const slug = await this.generateUniqueSlug(baseSlug);

    let stateName = dto.state;
    let stateId = dto.stateId;
    if (stateId && !stateName) {
      const st = await this.prisma.state.findUnique({ where: { id: stateId } });
      if (st) stateName = st.name;
    } else if (stateName && !stateId) {
      const st = await this.prisma.state.findFirst({
        where: {
          OR: [
            { name: { equals: stateName.trim(), mode: 'insensitive' } },
            { code: { equals: stateName.trim().toUpperCase() } },
          ],
        },
      });
      if (st) stateId = st.id;
    }
    const states = dto.states && dto.states.length > 0 ? dto.states : (stateName ? [stateName] : []);

    const scholarship = await this.prisma.scholarship.create({
      data: {
        scholarshipName: dto.scholarshipName,
        slug,
        provider: dto.provider,
        description: dto.description,
        scholarshipType: dto.scholarshipType,
        category: dto.category,
        gender: dto.gender,
        state: stateName,
        stateId: stateId,
        states: states,
        country: dto.country ?? 'India',
        incomeLimit: dto.incomeLimit,
        requiredMarks: dto.requiredMarks,
        eligibility: dto.eligibility,
        amount: dto.amount,
        currency: dto.currency ?? 'INR',
        percentage: dto.percentage,
        applicationMode: dto.applicationMode ?? 'ONLINE',
        applicationStart: dto.applicationStart
          ? new Date(dto.applicationStart)
          : null,
        applicationEnd: dto.applicationEnd
          ? new Date(dto.applicationEnd)
          : null,
        renewalRequired: dto.renewalRequired ?? false,
        requiredDocuments: dto.requiredDocuments ?? [],
        officialWebsite: dto.officialWebsite,
        faqs: dto.faqs ?? null,
        featured: dto.featured ?? false,
        status: dto.status ?? 'PUBLISHED',
      },
      include: {
        stateRelation: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'CREATE_SCHOLARSHIP',
      entity: 'Scholarship',
      entityId: scholarship.id,
      newValue: {
        scholarshipName: scholarship.scholarshipName,
        amount: scholarship.amount,
      },
    });

    return scholarship;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateScholarshipDto, adminId: string) {
    const existing = await this.prisma.scholarship.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Scholarship with ID ${id} not found`);
    }

    let stateName = dto.state;
    let stateId = dto.stateId;
    if (stateId && !stateName) {
      const st = await this.prisma.state.findUnique({ where: { id: stateId } });
      if (st) stateName = st.name;
    } else if (stateName && stateId === undefined) {
      const st = await this.prisma.state.findFirst({
        where: {
          OR: [
            { name: { equals: stateName.trim(), mode: 'insensitive' } },
            { code: { equals: stateName.trim().toUpperCase() } },
          ],
        },
      });
      if (st) stateId = st.id;
    }

    const updateData: Prisma.ScholarshipUpdateInput = {
      ...(dto.scholarshipName !== undefined && {
        scholarshipName: dto.scholarshipName,
      }),
      ...(dto.provider !== undefined && { provider: dto.provider }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.scholarshipType !== undefined && {
        scholarshipType: dto.scholarshipType,
      }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(stateName !== undefined && { state: stateName }),
      ...(stateId !== undefined && { stateId: stateId }),
      ...(dto.states !== undefined && { states: dto.states }),
      ...(dto.country !== undefined && { country: dto.country }),
      ...(dto.incomeLimit !== undefined && { incomeLimit: dto.incomeLimit }),
      ...(dto.requiredMarks !== undefined && {
        requiredMarks: dto.requiredMarks,
      }),
      ...(dto.eligibility !== undefined && { eligibility: dto.eligibility }),
      ...(dto.amount !== undefined && { amount: dto.amount }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.percentage !== undefined && { percentage: dto.percentage }),
      ...(dto.applicationMode !== undefined && {
        applicationMode: dto.applicationMode,
      }),
      ...(dto.applicationStart !== undefined && {
        applicationStart: dto.applicationStart
          ? new Date(dto.applicationStart)
          : null,
      }),
      ...(dto.applicationEnd !== undefined && {
        applicationEnd: dto.applicationEnd
          ? new Date(dto.applicationEnd)
          : null,
      }),
      ...(dto.renewalRequired !== undefined && {
        renewalRequired: dto.renewalRequired,
      }),
      ...(dto.requiredDocuments !== undefined && {
        requiredDocuments: dto.requiredDocuments,
      }),
      ...(dto.officialWebsite !== undefined && {
        officialWebsite: dto.officialWebsite,
      }),
      ...(dto.faqs !== undefined && { faqs: dto.faqs }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    const updated = await this.prisma.scholarship.update({
      where: { id },
      data: updateData,
      include: {
        stateRelation: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'UPDATE_SCHOLARSHIP',
      entity: 'Scholarship',
      entityId: id,
      oldValue: {
        scholarshipName: existing.scholarshipName,
        status: existing.status,
      },
      newValue: {
        scholarshipName: updated.scholarshipName,
        status: updated.status,
      },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOFT DELETE
  // ─────────────────────────────────────────────────────────────────────────

  async softDelete(id: string, adminId: string) {
    const existing = await this.prisma.scholarship.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Scholarship with ID ${id} not found`);
    }

    await this.prisma.scholarship.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'DELETE_SCHOLARSHIP',
      entity: 'Scholarship',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: 'ARCHIVED' },
    });

    return { message: 'Scholarship archived successfully', id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────────────────────────────────

  async getExportData(query: ScholarshipQueryDto) {
    const result = await this.findAll({ ...query, page: 1, limit: 10000 });
    return result.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async generateUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (await this.prisma.scholarship.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    return slug;
  }
}
