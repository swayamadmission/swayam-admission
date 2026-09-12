import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { UpdateStudyMaterialDto } from './dto/update-study-material.dto';
import { StudyMaterialQueryDto } from './dto/study-material-query.dto';
import { Prisma, EntityType } from '@prisma/client';

// STUDY_MATERIAL may not yet be in the generated Prisma client if regeneration
// is pending. We cast safely to handle both scenarios.
const STUDY_MATERIAL_TYPE = 'STUDY_MATERIAL' as EntityType;

@Injectable()
export class StudyMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD STATS
  // ─────────────────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalMaterials,
      activeMaterials,
      draftMaterials,
      featuredMaterials,
      premiumMaterials,
      totalPDFs,
      totalMockTests,
      downloadsAgg,
      viewsAgg,
      uploadsThisMonth,
    ] = await Promise.all([
      this.prisma.studyMaterial.count({
        where: { status: { not: 'ARCHIVED' } },
      }),
      this.prisma.studyMaterial.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.studyMaterial.count({ where: { status: 'DRAFT' } }),
      this.prisma.studyMaterial.count({
        where: { featured: true, status: { not: 'ARCHIVED' } },
      }),
      this.prisma.studyMaterial.count({
        where: { premium: true, status: { not: 'ARCHIVED' } },
      }),
      this.prisma.studyMaterial.count({
        where: { materialType: 'PDF', status: { not: 'ARCHIVED' } },
      }),
      this.prisma.studyMaterial.count({
        where: { materialType: 'Mock Test', status: { not: 'ARCHIVED' } },
      }),
      this.prisma.studyMaterial.aggregate({
        _sum: { downloadCount: true },
        where: { status: { not: 'ARCHIVED' } },
      }),
      this.prisma.studyMaterial.aggregate({
        _sum: { viewCount: true },
        where: { status: { not: 'ARCHIVED' } },
      }),
      this.prisma.studyMaterial.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      totalMaterials,
      activeMaterials,
      draftMaterials,
      featuredMaterials,
      premiumMaterials,
      totalPDFs,
      totalMockTests,
      totalDownloads: downloadsAgg._sum.downloadCount ?? 0,
      totalViews: viewsAgg._sum.viewCount ?? 0,
      uploadsThisMonth,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND ALL (Paginated, Filtered, Searchable)
  // ─────────────────────────────────────────────────────────────────────────

  async findAll(query: StudyMaterialQueryDto) {
    const {
      q,
      page = 1,
      limit = 20,
      category,
      materialType,
      stream,
      courseId,
      collegeId,
      examId,
      subject,
      semester,
      language,
      status,
      featured,
      premium,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.StudyMaterialWhereInput = {
      status: status ? status : { not: 'ARCHIVED' },
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { materialType: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (materialType)
      where.materialType = { equals: materialType, mode: 'insensitive' };
    if (stream) where.stream = { equals: stream, mode: 'insensitive' };
    if (courseId) where.courseId = courseId;
    if (collegeId) where.collegeId = collegeId;
    if (examId) where.examId = examId;
    if (subject) where.subject = { contains: subject, mode: 'insensitive' };
    if (semester) where.semester = { equals: semester, mode: 'insensitive' };
    if (language) where.language = { contains: language, mode: 'insensitive' };
    if (featured !== undefined) where.featured = featured === 'true';
    if (premium !== undefined) where.premium = premium === 'true';

    const ORDER_FIELDS: Record<
      string,
      Prisma.StudyMaterialOrderByWithRelationInput
    > = {
      title: { title: sortOrder as Prisma.SortOrder },
      downloadCount: { downloadCount: sortOrder as Prisma.SortOrder },
      viewCount: { viewCount: sortOrder as Prisma.SortOrder },
      createdAt: { createdAt: sortOrder as Prisma.SortOrder },
    };
    const orderBy: Prisma.StudyMaterialOrderByWithRelationInput = ORDER_FIELDS[
      sortBy
    ] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.studyMaterial.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          course: { select: { id: true, name: true } },
          college: {
            select: { id: true, name: true, city: true, state: true },
          },
          exam: { select: { id: true, examName: true } },
        },
      }),
      this.prisma.studyMaterial.count({ where }),
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
    const material = await this.prisma.studyMaterial.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, name: true, totalFees: true, slug: true },
        },
        college: {
          select: { id: true, name: true, city: true, state: true, slug: true },
        },
        exam: {
          select: { id: true, examName: true, category: true, slug: true },
        },
      },
    });

    if (!material) {
      throw new NotFoundException(`Study material with ID ${id} not found`);
    }

    return material;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND BY SLUG
  // ─────────────────────────────────────────────────────────────────────────

  async findBySlug(slug: string) {
    const material = await this.prisma.studyMaterial.findUnique({
      where: { slug },
      include: {
        course: {
          select: { id: true, name: true, totalFees: true, slug: true },
        },
        college: {
          select: { id: true, name: true, city: true, state: true, slug: true },
        },
        exam: {
          select: { id: true, examName: true, category: true, slug: true },
        },
      },
    });

    if (!material) {
      throw new NotFoundException(
        `Study material with slug "${slug}" not found`,
      );
    }

    return material;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  async create(dto: CreateStudyMaterialDto, adminId: string) {
    const baseSlug = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const slug = await this.generateUniqueSlug(baseSlug);

    const material = await this.prisma.studyMaterial.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        materialType: dto.materialType,
        category: dto.category,
        stream: dto.stream,
        courseId: dto.courseId || null,
        collegeId: dto.collegeId || null,
        examId: dto.examId || null,
        subject: dto.subject,
        semester: dto.semester,
        language: dto.language ?? 'English',
        fileName: dto.fileName,
        fileUrl: dto.fileUrl,
        thumbnail: dto.thumbnail,
        fileSize: dto.fileSize,
        fileExtension: dto.fileExtension,
        pages: dto.pages,
        featured: dto.featured ?? false,
        premium: dto.premium ?? false,
        tags: dto.tags ?? [],
        status: dto.status ?? 'PUBLISHED',
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
      },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'CREATE_STUDY_MATERIAL',
      entity: 'StudyMaterial',
      entityId: material.id,
      newValue: { title: material.title, materialType: material.materialType },
    });

    return material;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateStudyMaterialDto, adminId: string) {
    const existing = await this.prisma.studyMaterial.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Study material with ID ${id} not found`);
    }

    const updateData: Prisma.StudyMaterialUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.materialType !== undefined && { materialType: dto.materialType }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.stream !== undefined && { stream: dto.stream }),
      ...(dto.courseId !== undefined && {
        course: dto.courseId
          ? { connect: { id: dto.courseId } }
          : { disconnect: true },
      }),
      ...(dto.collegeId !== undefined && {
        college: dto.collegeId
          ? { connect: { id: dto.collegeId } }
          : { disconnect: true },
      }),
      ...(dto.examId !== undefined && {
        exam: dto.examId
          ? { connect: { id: dto.examId } }
          : { disconnect: true },
      }),
      ...(dto.subject !== undefined && { subject: dto.subject }),
      ...(dto.semester !== undefined && { semester: dto.semester }),
      ...(dto.language !== undefined && { language: dto.language }),
      ...(dto.fileName !== undefined && { fileName: dto.fileName }),
      ...(dto.fileUrl !== undefined && { fileUrl: dto.fileUrl }),
      ...(dto.thumbnail !== undefined && { thumbnail: dto.thumbnail }),
      ...(dto.fileSize !== undefined && { fileSize: dto.fileSize }),
      ...(dto.fileExtension !== undefined && {
        fileExtension: dto.fileExtension,
      }),
      ...(dto.pages !== undefined && { pages: dto.pages }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.premium !== undefined && { premium: dto.premium }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.seoTitle !== undefined && { seoTitle: dto.seoTitle }),
      ...(dto.seoDescription !== undefined && {
        seoDescription: dto.seoDescription,
      }),
    };

    const updated = await this.prisma.studyMaterial.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'UPDATE_STUDY_MATERIAL',
      entity: 'StudyMaterial',
      entityId: id,
      oldValue: { title: existing.title, status: existing.status },
      newValue: { title: updated.title, status: updated.status },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INCREMENT DOWNLOAD / VIEW
  // ─────────────────────────────────────────────────────────────────────────

  async incrementDownload(id: string, userId?: string) {
    const updated = await this.prisma.studyMaterial.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    // Track in recently-viewed history
    if (userId) {
      await this.auditService.logAction({
        userId,
        action: 'DOWNLOAD_STUDY_MATERIAL',
        entity: 'StudyMaterial',
        entityId: id,
        newValue: { downloadCount: updated.downloadCount },
      });

      // Track in RecentlyViewed
      await this.prisma.recentlyViewed.upsert({
        where: {
          userId_itemType_itemId: {
            userId,
            itemType: STUDY_MATERIAL_TYPE,
            itemId: id,
          },
        },
        create: { userId, itemType: STUDY_MATERIAL_TYPE, itemId: id },
        update: { viewedAt: new Date() },
      });
    }

    return updated;
  }

  async incrementView(id: string, userId?: string) {
    const updated = await this.prisma.studyMaterial.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    if (userId) {
      await this.prisma.recentlyViewed.upsert({
        where: {
          userId_itemType_itemId: {
            userId,
            itemType: STUDY_MATERIAL_TYPE,
            itemId: id,
          },
        },
        create: { userId, itemType: STUDY_MATERIAL_TYPE, itemId: id },
        update: { viewedAt: new Date() },
      });
    }

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOFT DELETE (Archive)
  // ─────────────────────────────────────────────────────────────────────────

  async softDelete(id: string, adminId: string) {
    const existing = await this.prisma.studyMaterial.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Study material with ID ${id} not found`);
    }

    await this.prisma.studyMaterial.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'DELETE_STUDY_MATERIAL',
      entity: 'StudyMaterial',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: 'ARCHIVED' },
    });

    return { message: 'Study material archived successfully', id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RESTORE (Archived → Published)
  // ─────────────────────────────────────────────────────────────────────────

  async restore(id: string, adminId: string) {
    const existing = await this.prisma.studyMaterial.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Study material with ID ${id} not found`);
    }

    const restored = await this.prisma.studyMaterial.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'RESTORE_STUDY_MATERIAL',
      entity: 'StudyMaterial',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: 'PUBLISHED' },
    });

    return restored;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DUPLICATE
  // ─────────────────────────────────────────────────────────────────────────

  async duplicate(id: string, adminId: string) {
    const existing = await this.prisma.studyMaterial.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Study material with ID ${id} not found`);
    }

    const baseSlug = `${existing.slug}-copy`;
    const slug = await this.generateUniqueSlug(baseSlug);

    const duplicate = await this.prisma.studyMaterial.create({
      data: {
        title: `${existing.title} (Copy)`,
        slug,
        description: existing.description,
        materialType: existing.materialType,
        category: existing.category,
        stream: existing.stream,
        courseId: existing.courseId,
        collegeId: existing.collegeId,
        examId: existing.examId,
        subject: existing.subject,
        semester: existing.semester,
        language: existing.language,
        fileName: existing.fileName,
        fileUrl: existing.fileUrl,
        thumbnail: existing.thumbnail,
        fileSize: existing.fileSize,
        fileExtension: existing.fileExtension,
        pages: existing.pages,
        featured: false,
        premium: existing.premium,
        tags: existing.tags,
        status: 'DRAFT',
        seoTitle: existing.seoTitle,
        seoDescription: existing.seoDescription,
      },
    });

    await this.auditService.logAction({
      userId: adminId,
      action: 'DUPLICATE_STUDY_MATERIAL',
      entity: 'StudyMaterial',
      entityId: duplicate.id,
      newValue: { originalId: id, title: duplicate.title },
    });

    return duplicate;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BOOKMARK / UNBOOKMARK
  // ─────────────────────────────────────────────────────────────────────────

  async bookmark(materialId: string, userId: string) {
    await this.prisma.savedItem.upsert({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType: STUDY_MATERIAL_TYPE,
          itemId: materialId,
        },
      },
      create: { userId, itemType: STUDY_MATERIAL_TYPE, itemId: materialId },
      update: {},
    });
    return { message: 'Bookmarked successfully', materialId };
  }

  async unbookmark(materialId: string, userId: string) {
    await this.prisma.savedItem.deleteMany({
      where: { userId, itemType: STUDY_MATERIAL_TYPE, itemId: materialId },
    });
    return { message: 'Bookmark removed', materialId };
  }

  async getBookmarks(userId: string) {
    const saved = await this.prisma.savedItem.findMany({
      where: { userId, itemType: STUDY_MATERIAL_TYPE },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const ids = saved.map((s) => s.itemId);
    if (ids.length === 0) return { data: [], total: 0 };

    const materials = await this.prisma.studyMaterial.findMany({
      where: { id: { in: ids }, status: { not: 'ARCHIVED' } },
      include: {
        course: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        exam: { select: { id: true, examName: true } },
      },
    });

    return { data: materials, total: materials.length };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HISTORY (Recently Viewed)
  // ─────────────────────────────────────────────────────────────────────────

  async getHistory(userId: string) {
    const viewed = await this.prisma.recentlyViewed.findMany({
      where: { userId, itemType: STUDY_MATERIAL_TYPE },
      orderBy: { viewedAt: 'desc' },
      take: 20,
    });

    const ids = viewed.map((v) => v.itemId);
    if (ids.length === 0) return { data: [], total: 0 };

    const materials = await this.prisma.studyMaterial.findMany({
      where: { id: { in: ids }, status: { not: 'ARCHIVED' } },
      include: {
        course: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        exam: { select: { id: true, examName: true } },
      },
    });

    // Preserve the view order
    const ordered = ids
      .map((id) => materials.find((m) => m.id === id))
      .filter(Boolean);

    return { data: ordered, total: ordered.length };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RECOMMENDED MATERIALS
  // ─────────────────────────────────────────────────────────────────────────

  async getRecommended(params: {
    category?: string;
    examId?: string;
    courseId?: string;
    materialType?: string;
    limit?: number;
  }) {
    const { category, examId, courseId, materialType, limit = 8 } = params;

    const where: Prisma.StudyMaterialWhereInput = {
      status: 'PUBLISHED',
    };

    const orConditions: Prisma.StudyMaterialWhereInput[] = [];

    if (category)
      orConditions.push({
        category: { equals: category, mode: 'insensitive' },
      });
    if (examId) orConditions.push({ examId });
    if (courseId) orConditions.push({ courseId });
    if (materialType)
      orConditions.push({
        materialType: { equals: materialType, mode: 'insensitive' },
      });

    // If we have specific filters, use them; otherwise return featured/popular
    if (orConditions.length > 0) {
      where.OR = orConditions;
    } else {
      where.featured = true;
    }

    const [featured, popular] = await Promise.all([
      this.prisma.studyMaterial.findMany({
        where: { ...where, featured: true },
        orderBy: { downloadCount: 'desc' },
        take: Math.ceil(limit / 2),
        include: {
          course: { select: { id: true, name: true } },
          college: { select: { id: true, name: true } },
          exam: { select: { id: true, examName: true } },
        },
      }),
      this.prisma.studyMaterial.findMany({
        where,
        orderBy: { downloadCount: 'desc' },
        take: limit,
        include: {
          course: { select: { id: true, name: true } },
          college: { select: { id: true, name: true } },
          exam: { select: { id: true, examName: true } },
        },
      }),
    ]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged = [...featured, ...popular].filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    return { data: merged.slice(0, limit), total: merged.length };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIND BY RELATIONS (for entity detail pages)
  // ─────────────────────────────────────────────────────────────────────────

  async findByCollege(collegeId: string, limit = 10) {
    const data = await this.prisma.studyMaterial.findMany({
      where: { collegeId, status: 'PUBLISHED' },
      orderBy: [{ featured: 'desc' }, { downloadCount: 'desc' }],
      take: limit,
      include: {
        exam: { select: { id: true, examName: true } },
        course: { select: { id: true, name: true } },
      },
    });
    return { data, total: data.length };
  }

  async findByCourse(courseId: string, limit = 10) {
    const data = await this.prisma.studyMaterial.findMany({
      where: { courseId, status: 'PUBLISHED' },
      orderBy: [{ featured: 'desc' }, { downloadCount: 'desc' }],
      take: limit,
      include: {
        exam: { select: { id: true, examName: true } },
        college: { select: { id: true, name: true } },
      },
    });
    return { data, total: data.length };
  }

  async findByExam(examId: string, limit = 12) {
    const data = await this.prisma.studyMaterial.findMany({
      where: { examId, status: 'PUBLISHED' },
      orderBy: [{ featured: 'desc' }, { downloadCount: 'desc' }],
      take: limit,
      include: {
        course: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
      },
    });
    return { data, total: data.length };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LATEST & FEATURED (for homepage / student dashboard)
  // ─────────────────────────────────────────────────────────────────────────

  async getLatest(limit = 8) {
    const data = await this.prisma.studyMaterial.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        course: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        exam: { select: { id: true, examName: true } },
      },
    });
    return { data, total: data.length };
  }

  async getFeatured(limit = 8) {
    const data = await this.prisma.studyMaterial.findMany({
      where: { status: 'PUBLISHED', featured: true },
      orderBy: { downloadCount: 'desc' },
      take: limit,
      include: {
        course: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        exam: { select: { id: true, examName: true } },
      },
    });
    return { data, total: data.length };
  }

  async getPopular(limit = 8) {
    const data = await this.prisma.studyMaterial.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { downloadCount: 'desc' },
      take: limit,
      include: {
        course: { select: { id: true, name: true } },
        college: { select: { id: true, name: true } },
        exam: { select: { id: true, examName: true } },
      },
    });
    return { data, total: data.length };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH (for global search integration)
  // ─────────────────────────────────────────────────────────────────────────

  async search(keyword: string, limit = 10) {
    const searchFilter = { contains: keyword, mode: 'insensitive' as const };
    return this.prisma.studyMaterial.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: searchFilter },
          { subject: searchFilter },
          { materialType: searchFilter },
          { category: searchFilter },
        ],
      },
      take: limit,
      orderBy: { downloadCount: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT
  // ─────────────────────────────────────────────────────────────────────────

  async getExportData(query: StudyMaterialQueryDto) {
    const result = await this.findAll({ ...query, page: 1, limit: 10000 });
    return result.data;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private async generateUniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 1;
    while (await this.prisma.studyMaterial.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    return slug;
  }
}
