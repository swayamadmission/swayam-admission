import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogQueryDto } from './dto/blog-query.dto';
import { GeoSeoUtility } from './geo-seo.utility';
import { Prisma } from '@prisma/client';
import { LiveSyncService } from '../events/live-sync.service';

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly liveSyncService: LiveSyncService,
  ) {}

  /**
   * Retrieves aggregated dashboard statistics for Blogs & SEO.
   */
  async getDashboardStats() {
    const [
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      scheduledBlogs,
      featuredBlogs,
      aggregateMetrics,
      categoriesGroup,
    ] = await Promise.all([
      this.prisma.blog.count({ where: { deletedAt: null } }),
      this.prisma.blog.count({
        where: { status: 'PUBLISHED', deletedAt: null },
      }),
      this.prisma.blog.count({ where: { status: 'DRAFT', deletedAt: null } }),
      this.prisma.blog.count({
        where: { status: 'SCHEDULED', deletedAt: null },
      }),
      this.prisma.blog.count({ where: { featured: true, deletedAt: null } }),
      this.prisma.blog.aggregate({
        where: { deletedAt: null },
        _sum: {
          views: true,
          likes: true,
          shares: true,
        },
        _avg: {
          geoScore: true,
          seoScore: true,
          readabilityScore: true,
          aiReadinessScore: true,
        },
      }),
      this.prisma.blog.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    return {
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      scheduledBlogs,
      featuredBlogs,
      totalViews: aggregateMetrics._sum.views || 0,
      totalLikes: aggregateMetrics._sum.likes || 0,
      totalShares: aggregateMetrics._sum.shares || 0,
      avgGeoScore: Math.round(aggregateMetrics._avg.geoScore || 80),
      avgSeoScore: Math.round(aggregateMetrics._avg.seoScore || 80),
      avgReadabilityScore: Math.round(
        aggregateMetrics._avg.readabilityScore || 85,
      ),
      avgAiReadinessScore: Math.round(
        aggregateMetrics._avg.aiReadinessScore || 80,
      ),
      categoriesCount: categoriesGroup.length,
      categories: categoriesGroup.map((c) => ({
        category: c.category,
        count: c._count._all,
      })),
    };
  }

  /**
   * Admin paginated search & query.
   */
  async findAll(query: BlogQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip =
      query.skip !== undefined ? Number(query.skip) : (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
        { excerpt: { contains: query.q, mode: 'insensitive' } },
        { stream: { contains: query.q, mode: 'insensitive' } },
        { specialization: { contains: query.q, mode: 'insensitive' } },
        { careerPath: { contains: query.q, mode: 'insensitive' } },
        { career: { contains: query.q, mode: 'insensitive' } },
        { state: { contains: query.q, mode: 'insensitive' } },
        { city: { contains: query.q, mode: 'insensitive' } },
        { tags: { has: query.q } },
      ];
    }

    if (query.category && query.category !== 'All') {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.guideType && query.guideType !== 'All') {
      where.guideType = query.guideType;
    }

    if (query.educationLevel && query.educationLevel !== 'All') {
      where.educationLevel = { equals: query.educationLevel, mode: 'insensitive' };
    }

    if (query.stream && query.stream !== 'All') {
      where.stream = { equals: query.stream, mode: 'insensitive' };
    }

    if (query.specialization && query.specialization !== 'All') {
      where.specialization = { contains: query.specialization, mode: 'insensitive' };
    }

    if (query.status && query.status !== 'All') {
      where.status = query.status;
    }

    if (query.featured !== undefined) {
      where.featured = String(query.featured) === 'true' || query.featured === true;
    }

    if (query.tag) {
      where.tags = { has: query.tag };
    }

    if (query.authorId) {
      where.authorId = query.authorId;
    }

    if (query.collegeId) {
      where.collegeId = query.collegeId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const orderByField = query.sortBy || 'createdAt';
    const orderDirection = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          author: { select: { id: true, fullName: true, email: true } },
          college: { select: { id: true, name: true, slug: true } },
          course: { select: { id: true, name: true, slug: true } },
          exam: { select: { id: true, examName: true, slug: true } },
          scholarship: {
            select: { id: true, scholarshipName: true, slug: true },
          },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Public blog listing query.
   */
  async findPublic(query: BlogQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'PUBLISHED',
      deletedAt: null,
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { content: { contains: query.q, mode: 'insensitive' } },
        { excerpt: { contains: query.q, mode: 'insensitive' } },
        { career: { contains: query.q, mode: 'insensitive' } },
        { careerPath: { contains: query.q, mode: 'insensitive' } },
        { stream: { contains: query.q, mode: 'insensitive' } },
        { specialization: { contains: query.q, mode: 'insensitive' } },
        { state: { contains: query.q, mode: 'insensitive' } },
        { tags: { has: query.q } },
      ];
    }

    if (query.category && query.category.toLowerCase() !== 'all') {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.guideType && query.guideType.toLowerCase() !== 'all') {
      where.guideType = query.guideType;
    }

    if (query.educationLevel && query.educationLevel.toLowerCase() !== 'all') {
      where.educationLevel = { equals: query.educationLevel, mode: 'insensitive' };
    }

    if (query.stream && query.stream.toLowerCase() !== 'all') {
      where.stream = { equals: query.stream, mode: 'insensitive' };
    }

    if (query.specialization && query.specialization.toLowerCase() !== 'all') {
      where.specialization = { contains: query.specialization, mode: 'insensitive' };
    }

    if (query.state && query.state.toLowerCase() !== 'all') {
      where.state = { equals: query.state, mode: 'insensitive' };
    }

    if (query.courseId) {
      where.courseId = query.courseId;
    }

    if (query.featured !== undefined) {
      where.featured = String(query.featured) === 'true' || query.featured === true;
    }

    const [data, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: { select: { id: true, fullName: true } },
          college: { select: { id: true, name: true, slug: true, city: true, state: true } },
          course: { select: { id: true, name: true, slug: true, duration: true, totalFees: true } },
          exam: { select: { id: true, examName: true, slug: true } },
          scholarship: { select: { id: true, scholarshipName: true, slug: true } },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Public blog detail by slug (increments views count & returns Schema.org structured data).
   */
  async findBySlug(slug: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        college: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            website: true,
          },
        },
        course: {
          select: { id: true, name: true, slug: true, description: true },
        },
        exam: { select: { id: true, examName: true, slug: true } },
        scholarship: {
          select: { id: true, scholarshipName: true, slug: true },
        },
      },
    });

    if (!blog || blog.deletedAt) {
      throw new NotFoundException(`Blog with slug "${slug}" not found`);
    }

    // Atomic increment of views
    await this.prisma.blog.update({
      where: { id: blog.id },
      data: { views: { increment: 1 } },
    });

    // Fetch related blogs (by category or tags)
    const relatedBlogs = await this.prisma.blog.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        id: { not: blog.id },
        category: blog.category,
      },
      take: 4,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        thumbnail: true,
        category: true,
        readingTime: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    // Generate JSON-LD Schema.org structured data
    const schemaOrg = GeoSeoUtility.generateSchemaOrg(blog);

    return {
      blog,
      relatedBlogs,
      schemaOrg,
    };
  }

  /**
   * Admin detail view by ID.
   */
  async findById(id: string) {
    const blog = await this.prisma.blog.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
        college: true,
        course: true,
        exam: true,
        scholarship: true,
        revisions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${id} not found`);
    }

    return blog;
  }

  /**
   * Helper to safely generate a unique slug, guaranteeing zero P2002 unique constraint crashes.
   */
  private async generateUniqueSlug(
    titleOrSlug: string,
    excludeId?: string,
  ): Promise<string> {
    const raw = (titleOrSlug || 'guide').trim();
    let base = GeoSeoUtility.generateSlug(raw);
    if (!base) base = `guide-${Date.now().toString().slice(-4)}`;

    let slug = base;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.blog.findFirst({
        where: {
          slug,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (!existing) {
        return slug;
      }
      slug = `${base}-${counter}`;
      counter++;
    }
  }

  /**
   * Sanitizes input data before sending to Prisma.
   * - Strips nested relation models and read-only DB fields.
   * - Converts empty string foreign key IDs to null or verifies existence.
   * - Normalizes JSON and array fields.
   */
  private async sanitizeBlogData(dto: any) {
    const data: any = { ...dto };

    // Strip read-only and relational objects
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    delete data.deletedAt;
    delete data.author;
    delete data.college;
    delete data.course;
    delete data.exam;
    delete data.scholarship;
    delete data.StudyMaterial;
    delete data.revisions;
    delete data.FAQ;
    delete data.savedGuides;
    delete data._count;
    delete data.views;
    delete data.likes;
    delete data.shares;

    // String arrays
    const arrayFields = [
      'tags',
      'gallery',
      'keyTakeaways',
      'seoKeywords',
      'skills',
      'entranceExams',
      'higherStudyOptions',
      'jobRoles',
      'requiredDocuments',
      'relatedCourseIds',
      'relatedCollegeIds',
      'relatedExamIds',
      'relatedScholarshipIds',
      'relatedBlogs',
    ];
    for (const field of arrayFields) {
      if (data[field] !== undefined) {
        if (Array.isArray(data[field])) {
          data[field] = data[field]
            .map((item: any) =>
              typeof item === 'string' ? item.trim() : String(item || '').trim(),
            )
            .filter((item: string) => item.length > 0);
        } else if (typeof data[field] === 'string' && data[field].trim()) {
          data[field] = [data[field].trim()];
        } else {
          data[field] = [];
        }
      }
    }

    // JSON fields: faqs, admissionStages, importantTimelines, entities, openGraph, twitterCard
    if (data.faqs !== undefined) {
      if (Array.isArray(data.faqs)) {
        const cleanFaqs = data.faqs.filter(
          (f: any) =>
            f &&
            (typeof f.question === 'string'
              ? f.question.trim()
              : Boolean(f.question)) &&
            (typeof f.answer === 'string'
              ? f.answer.trim()
              : Boolean(f.answer)),
        );
        data.faqs = cleanFaqs.length > 0 ? (cleanFaqs as Prisma.InputJsonValue) : Prisma.DbNull;
      } else if (!data.faqs) {
        data.faqs = Prisma.DbNull;
      }
    }

    if (data.admissionStages !== undefined) {
      if (typeof data.admissionStages === 'string') {
        const trimmed = data.admissionStages.trim();
        if (!trimmed) {
          data.admissionStages = Prisma.DbNull;
        } else {
          try {
            data.admissionStages = JSON.parse(trimmed) as Prisma.InputJsonValue;
          } catch {
            data.admissionStages = { stages: trimmed } as Prisma.InputJsonValue;
          }
        }
      } else if (!data.admissionStages) {
        data.admissionStages = Prisma.DbNull;
      }
    }

    if (data.importantTimelines !== undefined) {
      if (typeof data.importantTimelines === 'string') {
        const trimmed = data.importantTimelines.trim();
        if (!trimmed) {
          data.importantTimelines = Prisma.DbNull;
        } else {
          try {
            data.importantTimelines = JSON.parse(trimmed) as Prisma.InputJsonValue;
          } catch {
            data.importantTimelines = { timelines: trimmed } as Prisma.InputJsonValue;
          }
        }
      } else if (!data.importantTimelines) {
        data.importantTimelines = Prisma.DbNull;
      }
    }

    for (const jsonField of ['entities', 'openGraph', 'twitterCard']) {
      if (data[jsonField] !== undefined) {
        if (typeof data[jsonField] === 'string') {
          const trimmed = data[jsonField].trim();
          if (!trimmed) {
            data[jsonField] = Prisma.DbNull;
          } else {
            try {
              data[jsonField] = JSON.parse(trimmed) as Prisma.InputJsonValue;
            } catch {
              data[jsonField] = { value: trimmed } as Prisma.InputJsonValue;
            }
          }
        } else if (!data[jsonField]) {
          data[jsonField] = Prisma.DbNull;
        }
      }
    }

    // Foreign key validation (convert empty string to null and ensure existing record)
    const fkFields = [
      { key: 'collegeId', model: this.prisma.college },
      { key: 'courseId', model: this.prisma.course },
      { key: 'examId', model: this.prisma.exam },
      { key: 'scholarshipId', model: this.prisma.scholarship },
      { key: 'studyMaterialId', model: this.prisma.studyMaterial },
      { key: 'authorId', model: this.prisma.user },
    ];

    for (const { key, model } of fkFields) {
      if (data[key] !== undefined) {
        const val =
          typeof data[key] === 'string' ? data[key].trim() : data[key];
        if (!val) {
          data[key] = null;
        } else {
          const exists = await (model as any).findUnique({
            where: { id: val },
            select: { id: true },
          });
          data[key] = exists ? val : null;
        }
      }
    }

    // Scalar optional strings: trim and convert empty string to null
    const strFields = [
      'stateId',
      'districtId',
      'state',
      'city',
      'educationLevel',
      'stream',
      'specialization',
      'careerPath',
      'eligibility',
      'salaryRange',
      'averageSalary',
      'growthRate',
      'govPrivatePaths',
      'admissionProcess',
      'applicationProcess',
      'feesInfo',
      'counsellingInfo',
      'scholarshipInfo',
      'stateSchemesInfo',
      'prepGuidance',
      'seoTitle',
      'seoDescription',
      'canonicalUrl',
      'aiSummary',
      'tldr',
      'featuredImage',
      'thumbnail',
      'excerpt',
      'career',
      'governmentScheme',
    ];

    for (const field of strFields) {
      if (data[field] !== undefined) {
        if (typeof data[field] === 'string') {
          data[field] = data[field].trim() || null;
        }
      }
    }

    if (!data.guideType) {
      data.guideType = 'CAREER';
    }

    if (data.status) {
      data.status = String(data.status).toUpperCase();
    }

    if (data.featured !== undefined) {
      data.featured = Boolean(data.featured);
    }

    return data;
  }

  /**
   * Creates a new blog article / guide.
   */
  async create(createDto: CreateBlogDto, userId?: string) {
    const sanitized = await this.sanitizeBlogData(createDto);

    const slug = await this.generateUniqueSlug(
      sanitized.slug || sanitized.title,
    );
    sanitized.slug = slug;

    const readingTime =
      sanitized.readingTime ||
      GeoSeoUtility.calculateReadingTime(sanitized.content || '');
    const scores = GeoSeoUtility.calculateScores(sanitized);

    sanitized.readingTime = readingTime;
    sanitized.authorId = sanitized.authorId || userId;
    sanitized.createdBy = userId;
    sanitized.publishedAt =
      sanitized.status === 'PUBLISHED'
        ? new Date()
        : sanitized.publishedAt
          ? new Date(sanitized.publishedAt)
          : null;
    sanitized.readabilityScore =
      sanitized.readabilityScore || scores.readabilityScore;
    sanitized.seoScore = sanitized.seoScore || scores.seoScore;
    sanitized.geoScore = sanitized.geoScore || scores.geoScore;
    sanitized.aiReadinessScore =
      sanitized.aiReadinessScore || scores.aiReadinessScore;

    const blog = await this.prisma.blog.create({
      data: {
        ...sanitized,
        revisions: {
          create: {
            versionNumber: 1,
            title: sanitized.title,
            content: sanitized.content,
            excerpt: sanitized.excerpt || null,
            seoTitle: sanitized.seoTitle || null,
            seoDescription: sanitized.seoDescription || null,
            faqs:
              sanitized.faqs !== undefined ? sanitized.faqs : Prisma.DbNull,
            keyTakeaways: sanitized.keyTakeaways || [],
            createdBy: userId,
          },
        },
      },
    });

    await this.logAuditAction('CREATE', 'BLOG', blog.id, null, blog, userId);

    try {
      this.liveSyncService.publishEvent(
        blog.status === 'PUBLISHED' ? 'guide.published' : 'guide.created',
        {
          guideId: blog.id,
          title: blog.title,
          status: blog.status,
          featured: blog.featured,
          guideType: blog.guideType,
        },
      );
    } catch {
      // ignore
    }

    return blog;
  }

  /**
   * Updates an existing blog article / guide.
   */
  async update(id: string, updateDto: UpdateBlogDto, userId?: string) {
    const existing = await this.findById(id);
    const sanitized = await this.sanitizeBlogData(updateDto);

    let slug = existing.slug;
    if (sanitized.slug && sanitized.slug !== existing.slug) {
      slug = await this.generateUniqueSlug(sanitized.slug, id);
    }
    sanitized.slug = slug;

    const content =
      sanitized.content !== undefined ? sanitized.content : existing.content;
    const readingTime =
      sanitized.readingTime || GeoSeoUtility.calculateReadingTime(content);
    const scores = GeoSeoUtility.calculateScores({
      ...existing,
      ...sanitized,
      content,
    });

    let publishedAt = existing.publishedAt;
    if (sanitized.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      publishedAt = new Date();
    } else if (sanitized.status && sanitized.status !== 'PUBLISHED') {
      publishedAt = null;
    } else if (sanitized.publishedAt) {
      publishedAt = new Date(sanitized.publishedAt);
    }

    sanitized.readingTime = readingTime;
    sanitized.publishedAt = publishedAt;
    sanitized.readabilityScore =
      sanitized.readabilityScore || scores.readabilityScore;
    sanitized.seoScore = sanitized.seoScore || scores.seoScore;
    sanitized.geoScore = sanitized.geoScore || scores.geoScore;
    sanitized.aiReadinessScore =
      sanitized.aiReadinessScore || scores.aiReadinessScore;
    sanitized.updatedBy = userId;

    const nextVersion = (existing.revisions?.length || 0) + 1;

    const updated = await this.prisma.blog.update({
      where: { id },
      data: {
        ...sanitized,
        revisions: {
          create: {
            versionNumber: nextVersion,
            title: sanitized.title || existing.title,
            content,
            excerpt:
              sanitized.excerpt !== undefined
                ? sanitized.excerpt
                : existing.excerpt,
            seoTitle:
              sanitized.seoTitle !== undefined
                ? sanitized.seoTitle
                : existing.seoTitle,
            seoDescription:
              sanitized.seoDescription !== undefined
                ? sanitized.seoDescription
                : existing.seoDescription,
            faqs:
              sanitized.faqs !== undefined
                ? sanitized.faqs
                : existing.faqs
                  ? (existing.faqs as Prisma.InputJsonValue)
                  : Prisma.DbNull,
            keyTakeaways:
              sanitized.keyTakeaways || existing.keyTakeaways || [],
            createdBy: userId,
          },
        },
      },
    });

    await this.logAuditAction(
      'UPDATE',
      'BLOG',
      updated.id,
      existing,
      updated,
      userId,
    );

    try {
      const eventType =
        updated.status === 'PUBLISHED'
          ? 'guide.published'
          : existing.status === 'PUBLISHED' && updated.status !== 'PUBLISHED'
            ? 'guide.unpublished'
            : 'guide.updated';

      this.liveSyncService.publishEvent(eventType, {
        guideId: updated.id,
        title: updated.title,
        status: updated.status,
        featured: updated.featured,
        guideType: updated.guideType,
      });
    } catch {
      // ignore
    }

    return updated;
  }

  /**
   * Toggles or sets the featured state of a guide.
   */
  async toggleFeatured(id: string, featured?: boolean, userId?: string) {
    const existing = await this.findById(id);
    const newFeatured = featured !== undefined ? featured : !existing.featured;

    const updated = await this.prisma.blog.update({
      where: { id },
      data: {
        featured: newFeatured,
        updatedBy: userId,
      },
    });

    await this.logAuditAction(
      'UPDATE_FEATURED',
      'BLOG',
      id,
      { featured: existing.featured },
      { featured: newFeatured },
      userId,
    );

    try {
      this.liveSyncService.publishEvent('guide.updated', {
        guideId: updated.id,
        title: updated.title,
        status: updated.status,
        featured: updated.featured,
        guideType: updated.guideType,
      });
    } catch {
      // ignore
    }

    return updated;
  }

  /**
   * Soft-deletes a blog article.
   */
  async remove(id: string, userId?: string) {
    const existing = await this.findById(id);

    const deleted = await this.prisma.blog.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    await this.logAuditAction(
      'DELETE',
      'BLOG',
      id,
      existing,
      { deleted: true },
      userId,
    );

    try {
      this.liveSyncService.publishEvent('guide.deleted', {
        guideId: id,
        title: existing.title,
      });
    } catch {
      // ignore
    }

    return deleted;
  }

  /**
   * Restores a soft-deleted blog article.
   */
  async restore(id: string, userId?: string) {
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog) throw new NotFoundException(`Blog with ID ${id} not found`);

    const restored = await this.prisma.blog.update({
      where: { id },
      data: {
        deletedAt: null,
        updatedBy: userId,
      },
    });

    await this.logAuditAction('RESTORE', 'BLOG', id, null, restored, userId);

    try {
      this.liveSyncService.publishEvent(
        restored.status === 'PUBLISHED' ? 'guide.published' : 'guide.created',
        {
          guideId: restored.id,
          title: restored.title,
          status: restored.status,
          guideType: restored.guideType,
        },
      );
    } catch {
      // ignore
    }

    return restored;
  }

  /**
   * Duplicates an existing blog / guide with full ERP fields and collision-free slug.
   */
  async duplicate(id: string, userId?: string) {
    const source = await this.findById(id);
    const newTitle = `${source.title} (Copy)`;
    const newSlug = await this.generateUniqueSlug(`${source.slug}-copy`);

    const copy = await this.prisma.blog.create({
      data: {
        title: newTitle,
        slug: newSlug,
        excerpt: source.excerpt,
        content: source.content,
        featuredImage: source.featuredImage,
        thumbnail: source.thumbnail,
        gallery: source.gallery || [],
        category: source.category,
        tags: source.tags || [],
        authorId: userId || source.authorId,
        status: 'DRAFT',
        featured: false,
        seoTitle: source.seoTitle ? `${source.seoTitle} (Copy)` : null,
        seoDescription: source.seoDescription,
        seoKeywords: source.seoKeywords || [],
        canonicalUrl: source.canonicalUrl,
        metaRobots: source.metaRobots,
        aiSummary: source.aiSummary,
        tldr: source.tldr,
        keyTakeaways: source.keyTakeaways || [],
        faqs: source.faqs ? (source.faqs as Prisma.InputJsonValue) : Prisma.DbNull,
        entities: source.entities
          ? (source.entities as Prisma.InputJsonValue)
          : Prisma.DbNull,
        readabilityScore: source.readabilityScore,
        seoScore: source.seoScore,
        geoScore: source.geoScore,
        aiReadinessScore: source.aiReadinessScore,
        collegeId: source.collegeId,
        courseId: source.courseId,
        examId: source.examId,
        scholarshipId: source.scholarshipId,
        studyMaterialId: source.studyMaterialId,
        readingTime: source.readingTime,
        state: source.state,
        city: source.city,
        governmentScheme: source.governmentScheme,
        career: source.career,

        // Career & Admission Guide ERP Attributes
        guideType: source.guideType || 'CAREER',
        educationLevel: source.educationLevel,
        stream: source.stream,
        specialization: source.specialization,
        careerPath: source.careerPath,
        skills: source.skills || [],
        eligibility: source.eligibility,
        entranceExams: source.entranceExams || [],
        salaryRange: source.salaryRange,
        averageSalary: source.averageSalary,
        growthRate: source.growthRate,
        higherStudyOptions: source.higherStudyOptions || [],
        jobRoles: source.jobRoles || [],
        govPrivatePaths: source.govPrivatePaths,
        admissionProcess: source.admissionProcess,
        applicationProcess: source.applicationProcess,
        requiredDocuments: source.requiredDocuments || [],
        admissionStages: source.admissionStages
          ? (source.admissionStages as Prisma.InputJsonValue)
          : Prisma.DbNull,
        feesInfo: source.feesInfo,
        counsellingInfo: source.counsellingInfo,
        scholarshipInfo: source.scholarshipInfo,
        stateSchemesInfo: source.stateSchemesInfo,
        importantTimelines: source.importantTimelines
          ? (source.importantTimelines as Prisma.InputJsonValue)
          : Prisma.DbNull,
        prepGuidance: source.prepGuidance,
        relatedCourseIds: source.relatedCourseIds || [],
        relatedCollegeIds: source.relatedCollegeIds || [],
        relatedExamIds: source.relatedExamIds || [],
        relatedScholarshipIds: source.relatedScholarshipIds || [],
        stateId: source.stateId,
        districtId: source.districtId,
        createdBy: userId,
      },
    });

    await this.logAuditAction(
      'DUPLICATE',
      'BLOG',
      copy.id,
      { sourceId: id },
      copy,
      userId,
    );

    try {
      this.liveSyncService.publishEvent('guide.created', {
        guideId: copy.id,
        title: copy.title,
        status: copy.status,
        featured: copy.featured,
        guideType: copy.guideType,
      });
    } catch {
      // ignore
    }

    return copy;
  }

  /**
   * Increment like count.
   */
  async likeBlog(slug: string) {
    const blog = await this.prisma.blog.findUnique({ where: { slug } });
    if (!blog || blog.deletedAt) throw new NotFoundException('Blog not found');

    return this.prisma.blog.update({
      where: { id: blog.id },
      data: { likes: { increment: 1 } },
      select: { id: true, likes: true },
    });
  }

  /**
   * Increment share count.
   */
  async shareBlog(slug: string) {
    const blog = await this.prisma.blog.findUnique({ where: { slug } });
    if (!blog || blog.deletedAt) throw new NotFoundException('Blog not found');

    return this.prisma.blog.update({
      where: { id: blog.id },
      data: { shares: { increment: 1 } },
      select: { id: true, shares: true },
    });
  }

  /**
   * Exports blogs to CSV format based on active query filters.
   */
  async exportCsv(query: BlogQueryDto): Promise<string> {
    const { data } = await this.findAll({ ...query, limit: 1000 });

    const headers = [
      'ID',
      'Title',
      'Slug',
      'Category',
      'Guide Type',
      'Education Level',
      'Stream',
      'Status',
      'Featured',
      'Author',
      'Views',
      'Likes',
      'Shares',
      'SEO Score',
      'GEO Score',
      'Created At',
    ];

    const rows = data.map((b) => [
      `"${b.id}"`,
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${b.slug}"`,
      `"${b.category}"`,
      `"${b.guideType || 'CAREER'}"`,
      `"${b.educationLevel || ''}"`,
      `"${b.stream || ''}"`,
      `"${b.status}"`,
      `"${b.featured}"`,
      `"${b.author?.fullName || 'N/A'}"`,
      b.views || 0,
      b.likes || 0,
      b.shares || 0,
      b.seoScore || 0,
      b.geoScore || 0,
      `"${new Date(b.createdAt).toISOString()}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Retrieves revision history for a blog.
   */
  async getRevisions(blogId: string) {
    return this.prisma.blogRevision.findMany({
      where: { blogId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Rollback blog to a specific revision.
   */
  async rollbackRevision(blogId: string, revisionId: string, userId?: string) {
    const revision = await this.prisma.blogRevision.findUnique({
      where: { id: revisionId },
    });
    if (!revision || revision.blogId !== blogId) {
      throw new BadRequestException('Invalid revision ID for this blog');
    }

    return this.update(
      blogId,
      {
        title: revision.title,
        content: revision.content,
        excerpt: revision.excerpt || undefined,
        seoTitle: revision.seoTitle || undefined,
        seoDescription: revision.seoDescription || undefined,
        faqs: (revision.faqs as any[]) || undefined,
        keyTakeaways: revision.keyTakeaways || undefined,
      },
      userId,
    );
  }

  /**
   * Helper to write mutation log to AuditLog.
   */
  private async logAuditAction(
    action: string,
    entity: string,
    entityId: string,
    oldValue: any,
    newValue: any,
    userId?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          entity,
          entityId,
          oldValue: oldValue
            ? (JSON.parse(JSON.stringify(oldValue)) as Prisma.InputJsonValue)
            : undefined,
          newValue: newValue
            ? (JSON.parse(JSON.stringify(newValue)) as Prisma.InputJsonValue)
            : undefined,
          userId: userId || undefined,
        },
      });
    } catch {
      // Audit log error non-blocking
    }
  }

  /**
   * Resolves related courses, colleges, exams, and scholarships for a guide.
   */
  async resolveRelatedEntities(blog: any) {
    if (!blog) return blog;
    const [courses, colleges, exams, scholarships] = await Promise.all([
      Array.isArray(blog.relatedCourseIds) && blog.relatedCourseIds.length > 0
        ? this.prisma.course.findMany({
            where: { id: { in: blog.relatedCourseIds } },
            select: {
              id: true,
              name: true,
              slug: true,
              duration: true,
              totalFees: true,
              category: true,
            },
          })
        : Promise.resolve([]),
      Array.isArray(blog.relatedCollegeIds) && blog.relatedCollegeIds.length > 0
        ? this.prisma.college.findMany({
            where: { id: { in: blog.relatedCollegeIds } },
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              city: true,
              state: true,
            },
          })
        : Promise.resolve([]),
      Array.isArray(blog.relatedExamIds) && blog.relatedExamIds.length > 0
        ? this.prisma.exam.findMany({
            where: { id: { in: blog.relatedExamIds } },
            select: { id: true, examName: true, slug: true },
          })
        : Promise.resolve([]),
      Array.isArray(blog.relatedScholarshipIds) &&
      blog.relatedScholarshipIds.length > 0
        ? this.prisma.scholarship.findMany({
            where: { id: { in: blog.relatedScholarshipIds } },
            select: {
              id: true,
              scholarshipName: true,
              slug: true,
              amount: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      ...blog,
      resolvedRelatedCourses: courses,
      resolvedRelatedColleges: colleges,
      resolvedRelatedExams: exams,
      resolvedRelatedScholarships: scholarships,
    };
  }

  /**
   * Preview a guide as it would appear on the student panel without publishing.
   */
  async getPreview(id: string) {
    const blog = await this.findById(id);
    return this.resolveRelatedEntities(blog);
  }

  /**
   * Personalized recommendations based ONLY on actual student data.
   */
  async getPersonalizedGuides(userId: string) {
    if (!userId) return [];

    const user: any = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        studentPreference: true,
        applications: {
          where: { status: { not: 'REJECTED' } },
          include: {
            course: { select: { id: true, name: true, category: true } },
            college: { select: { id: true, name: true, state: true } },
          },
        },
        assignedCounselor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            designation: true,
          },
        },
      },
    });

    if (!user) return [];

    const stream = user.studentPreference?.stream || null;
    const preferredCourses: string[] = user.studentPreference?.preferredCourses || [];
    const preferredStates: string[] = user.studentPreference?.preferredStates || [];
    const loanRequired = user.studentPreference?.loanRequired || false;
    const scholarshipRequired =
      user.studentPreference?.scholarshipRequired || false;

    const applications: any[] = user.applications || [];
    const appCourseIds: string[] = applications
      .map((a: any) => a.courseId)
      .filter(Boolean);
    const appCollegeIds: string[] = applications
      .map((a: any) => a.collegeId)
      .filter((c: any): c is string => !!c);
    const appCategories: string[] = applications
      .map((a: any) => a.course?.category)
      .filter(Boolean);

    let educationLevel: string | null = null;
    if (user.profile?.graduationCourse || user.profile?.graduationPassingYear) {
      educationLevel = 'Postgraduate';
    } else if (user.profile?.twelfthMarks || user.profile?.twelfthPassingYear) {
      educationLevel = 'Undergraduate';
    } else if (user.profile?.tenthMarks || user.profile?.tenthPassingYear) {
      educationLevel = '12th';
    }

    const conditions: any[] = [];

    if (stream) {
      conditions.push({
        stream: { equals: String(stream), mode: 'insensitive' },
      });
    }
    for (const cat of appCategories) {
      if (cat) {
        conditions.push({ stream: { equals: String(cat), mode: 'insensitive' } });
      }
    }

    if (educationLevel) {
      conditions.push({
        educationLevel: { equals: educationLevel, mode: 'insensitive' },
      });
    }

    if (preferredCourses.length > 0) {
      for (const c of preferredCourses) {
        conditions.push({
          OR: [
            { course: { name: { contains: c, mode: 'insensitive' } } },
            { title: { contains: c, mode: 'insensitive' } },
          ],
        });
      }
    }

    if (appCourseIds.length > 0) {
      conditions.push({ courseId: { in: appCourseIds } });
    }

    if (appCollegeIds.length > 0) {
      conditions.push({ collegeId: { in: appCollegeIds } });
    }

    if (user.profile?.state) {
      conditions.push({
        state: { equals: user.profile.state, mode: 'insensitive' },
      });
    }
    for (const st of preferredStates) {
      if (st) {
        conditions.push({ state: { equals: st, mode: 'insensitive' } });
      }
    }

    if (scholarshipRequired || loanRequired) {
      conditions.push({
        OR: [
          { scholarshipId: { not: null } },
          { governmentScheme: { not: null } },
          { category: { contains: 'Scholarship', mode: 'insensitive' } },
        ],
      });
    }

    if (conditions.length === 0) {
      return [];
    }

    const guides: any[] = await this.prisma.blog.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        OR: conditions,
      },
      take: 20,
      include: {
        author: { select: { id: true, fullName: true } },
        college: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
          },
        },
        course: {
          select: {
            id: true,
            name: true,
            slug: true,
            duration: true,
            totalFees: true,
          },
        },
        exam: { select: { id: true, examName: true, slug: true } },
        scholarship: {
          select: { id: true, scholarshipName: true, slug: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const scored = guides.map((guide: any) => {
      let score = 0;
      const reasons: string[] = [];

      if (
        stream &&
        guide.stream &&
        guide.stream.toLowerCase() === String(stream).toLowerCase()
      ) {
        score += 30;
        reasons.push(`Matches your ${stream} stream`);
      }
      if (
        educationLevel &&
        guide.educationLevel &&
        guide.educationLevel.toLowerCase() === educationLevel.toLowerCase()
      ) {
        score += 25;
        reasons.push(`Relevant for ${educationLevel} studies`);
      }
      if (guide.courseId && appCourseIds.includes(guide.courseId)) {
        score += 35;
        reasons.push(
          `Directly matches your application for ${guide.course?.name || 'course'}`,
        );
      }
      if (
        user.profile?.state &&
        guide.state &&
        guide.state.toLowerCase() === user.profile.state.toLowerCase()
      ) {
        score += 15;
        reasons.push(`State-specific guidance for ${guide.state}`);
      }
      if (
        (scholarshipRequired || loanRequired) &&
        (guide.scholarshipId || guide.governmentScheme)
      ) {
        score += 20;
        reasons.push('Includes financial assistance / scholarship guidance');
      }

      return {
        ...guide,
        recommendationScore: score,
        matchReason:
          reasons.join(' • ') ||
          'Recommended based on your profile preferences',
      };
    });

    scored.sort((a: any, b: any) => b.recommendationScore - a.recommendationScore);
    return scored;
  }

  /**
   * Save a guide for the authenticated student.
   */
  async saveGuide(userId: string, guideId: string) {
    if (!userId || !guideId) {
      throw new BadRequestException('User ID and Guide ID required');
    }
    let guide = await this.prisma.blog.findUnique({
      where: { id: guideId },
    });
    if (!guide) {
      guide = await this.prisma.blog.findUnique({
        where: { slug: guideId },
      });
    }
    if (!guide || guide.status !== 'PUBLISHED' || guide.deletedAt) {
      throw new NotFoundException('Published guide not found');
    }

    const targetGuideId = guide.id;

    await this.prisma.savedGuide.upsert({
      where: {
        userId_guideId: { userId, guideId: targetGuideId },
      },
      create: { userId, guideId: targetGuideId },
      update: {},
    });

    return { success: true, message: 'Guide saved successfully', guideId: targetGuideId };
  }

  /**
   * Unsave a guide for the authenticated student.
   */
  async unsaveGuide(userId: string, guideId: string) {
    if (!userId || !guideId) {
      throw new BadRequestException('User ID and Guide ID required');
    }
    let targetGuideId = guideId;
    const guide = await this.prisma.blog.findFirst({
      where: {
        OR: [{ id: guideId }, { slug: guideId }],
      },
      select: { id: true },
    });
    if (guide) {
      targetGuideId = guide.id;
    }

    await this.prisma.savedGuide.deleteMany({
      where: { userId, guideId: targetGuideId },
    });
    return { success: true, message: 'Guide removed from saved', guideId: targetGuideId };
  }

  /**
   * Fetch all saved guides for the authenticated student.
   */
  async getSavedGuides(userId: string) {
    if (!userId) return [];
    const saved: any[] = await this.prisma.savedGuide.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        guide: {
          include: {
            author: { select: { id: true, fullName: true } },
            college: {
              select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                state: true,
              },
            },
            course: {
              select: {
                id: true,
                name: true,
                slug: true,
                duration: true,
                totalFees: true,
              },
            },
            exam: { select: { id: true, examName: true, slug: true } },
            scholarship: {
              select: { id: true, scholarshipName: true, slug: true },
            },
          },
        },
      },
    });

    return saved
      .filter(
        (s: any) => s.guide && s.guide.status === 'PUBLISHED' && !s.guide.deletedAt,
      )
      .map((s: any) => ({
        ...s.guide,
        savedAt: s.createdAt,
      }));
  }

  /**
   * Retrieve real counselor recommendations/guidance for a student.
   */
  async getCounselorGuidance(userId: string) {
    if (!userId) return { hasCounselor: false, counselor: null, guides: [] };

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        assignedCounselorId: true,
        assignedCounselor: {
          select: {
            id: true,
            fullName: true,
            avatar: true,
            designation: true,
            qualification: true,
          },
        },
      },
    });

    if (!user || !user.assignedCounselor) {
      return {
        hasCounselor: false,
        counselor: null,
        message: 'No counselor assigned yet.',
        guides: [],
      };
    }

    const counselorGuides = await this.prisma.blog.findMany({
      where: {
        authorId: user.assignedCounselor.id,
        status: 'PUBLISHED',
        deletedAt: null,
      },
      take: 5,
      include: {
        course: { select: { id: true, name: true, slug: true } },
        college: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      hasCounselor: true,
      counselor: {
        id: user.assignedCounselor.id,
        fullName: user.assignedCounselor.fullName,
        designation: user.assignedCounselor.designation || 'Senior Educational Counselor',
        qualification: user.assignedCounselor.qualification || 'Career & Admission Guidance',
        avatar: user.assignedCounselor.avatar,
      },
      guides: counselorGuides,
    };
  }
}
