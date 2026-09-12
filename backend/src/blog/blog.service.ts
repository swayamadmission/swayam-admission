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

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

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
        { tags: { has: query.q } },
      ];
    }

    if (query.category && query.category !== 'All') {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.status && query.status !== 'All') {
      where.status = query.status;
    }

    if (query.featured !== undefined) {
      where.featured = query.featured;
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
      ];
    }

    if (query.category && query.category.toLowerCase() !== 'all') {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.featured !== undefined) {
      where.featured = query.featured;
    }

    const [data, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: {
          author: { select: { id: true, fullName: true } },
          college: { select: { id: true, name: true, slug: true } },
          course: { select: { id: true, name: true, slug: true } },
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
   * Creates a new blog article.
   */
  async create(createDto: CreateBlogDto, userId?: string) {
    let slug = createDto.slug
      ? GeoSeoUtility.generateSlug(createDto.slug)
      : GeoSeoUtility.generateSlug(createDto.title);

    // Ensure slug uniqueness
    const existingSlug = await this.prisma.blog.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const readingTime =
      createDto.readingTime ||
      GeoSeoUtility.calculateReadingTime(createDto.content);
    const scores = GeoSeoUtility.calculateScores(createDto);

    const blog = await this.prisma.blog.create({
      data: {
        ...createDto,
        faqs: createDto.faqs
          ? (createDto.faqs as Prisma.InputJsonValue)
          : undefined,
        entities: createDto.entities
          ? (createDto.entities as Prisma.InputJsonValue)
          : undefined,
        openGraph: createDto.openGraph
          ? (createDto.openGraph as Prisma.InputJsonValue)
          : undefined,
        twitterCard: createDto.twitterCard
          ? (createDto.twitterCard as Prisma.InputJsonValue)
          : undefined,
        slug,
        readingTime,
        authorId: createDto.authorId || userId,
        publishedAt:
          createDto.status === 'PUBLISHED'
            ? new Date()
            : createDto.publishedAt
              ? new Date(createDto.publishedAt)
              : null,
        readabilityScore: createDto.readabilityScore || scores.readabilityScore,
        seoScore: createDto.seoScore || scores.seoScore,
        geoScore: createDto.geoScore || scores.geoScore,
        aiReadinessScore: createDto.aiReadinessScore || scores.aiReadinessScore,
        createdBy: userId,
        revisions: {
          create: {
            versionNumber: 1,
            title: createDto.title,
            content: createDto.content,
            excerpt: createDto.excerpt || null,
            seoTitle: createDto.seoTitle || null,
            seoDescription: createDto.seoDescription || null,
            faqs: createDto.faqs
              ? (createDto.faqs as Prisma.InputJsonValue)
              : Prisma.DbNull,
            keyTakeaways: createDto.keyTakeaways || [],
            createdBy: userId,
          },
        },
      },
    });

    // Log Activity
    await this.logAuditAction('CREATE', 'BLOG', blog.id, null, blog, userId);

    return blog;
  }

  /**
   * Updates an existing blog article.
   */
  async update(id: string, updateDto: UpdateBlogDto, userId?: string) {
    const existing = await this.findById(id);

    let slug = existing.slug;
    if (updateDto.slug && updateDto.slug !== existing.slug) {
      slug = GeoSeoUtility.generateSlug(updateDto.slug);
      const duplicateSlug = await this.prisma.blog.findFirst({
        where: { slug, id: { not: id } },
      });
      if (duplicateSlug) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    const content =
      updateDto.content !== undefined ? updateDto.content : existing.content;
    const readingTime =
      updateDto.readingTime || GeoSeoUtility.calculateReadingTime(content);
    const scores = GeoSeoUtility.calculateScores({
      ...existing,
      ...updateDto,
      content,
    });

    let publishedAt = existing.publishedAt;
    if (updateDto.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      publishedAt = new Date();
    } else if (updateDto.publishedAt) {
      publishedAt = new Date(updateDto.publishedAt);
    }

    const nextVersion = (existing.revisions?.length || 0) + 1;

    const updated = await this.prisma.blog.update({
      where: { id },
      data: {
        ...updateDto,
        faqs:
          updateDto.faqs !== undefined
            ? (updateDto.faqs as Prisma.InputJsonValue)
            : (existing.faqs as Prisma.InputJsonValue),
        entities:
          updateDto.entities !== undefined
            ? (updateDto.entities as Prisma.InputJsonValue)
            : (existing.entities as Prisma.InputJsonValue),
        openGraph:
          updateDto.openGraph !== undefined
            ? (updateDto.openGraph as Prisma.InputJsonValue)
            : (existing.openGraph as Prisma.InputJsonValue),
        twitterCard:
          updateDto.twitterCard !== undefined
            ? (updateDto.twitterCard as Prisma.InputJsonValue)
            : (existing.twitterCard as Prisma.InputJsonValue),
        slug,
        readingTime,
        publishedAt,
        readabilityScore: updateDto.readabilityScore || scores.readabilityScore,
        seoScore: updateDto.seoScore || scores.seoScore,
        geoScore: updateDto.geoScore || scores.geoScore,
        aiReadinessScore: updateDto.aiReadinessScore || scores.aiReadinessScore,
        updatedBy: userId,
        revisions: {
          create: {
            versionNumber: nextVersion,
            title: updateDto.title || existing.title,
            content,
            excerpt:
              updateDto.excerpt !== undefined
                ? updateDto.excerpt
                : existing.excerpt,
            seoTitle:
              updateDto.seoTitle !== undefined
                ? updateDto.seoTitle
                : existing.seoTitle,
            seoDescription:
              updateDto.seoDescription !== undefined
                ? updateDto.seoDescription
                : existing.seoDescription,
            faqs:
              updateDto.faqs !== undefined
                ? (updateDto.faqs as Prisma.InputJsonValue)
                : (existing.faqs as Prisma.InputJsonValue),
            keyTakeaways: updateDto.keyTakeaways || existing.keyTakeaways || [],
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

    return restored;
  }

  /**
   * Duplicates an existing blog.
   */
  async duplicate(id: string, userId?: string) {
    const source = await this.findById(id);
    const newTitle = `${source.title} (Copy)`;
    const newSlug = `${source.slug}-copy-${Date.now().toString().slice(-4)}`;

    const copy = await this.prisma.blog.create({
      data: {
        title: newTitle,
        slug: newSlug,
        excerpt: source.excerpt,
        content: source.content,
        featuredImage: source.featuredImage,
        thumbnail: source.thumbnail,
        gallery: source.gallery,
        category: source.category,
        tags: source.tags,
        authorId: userId || source.authorId,
        status: 'DRAFT',
        featured: false,
        seoTitle: source.seoTitle ? `${source.seoTitle} (Copy)` : undefined,
        seoDescription: source.seoDescription,
        seoKeywords: source.seoKeywords,
        canonicalUrl: source.canonicalUrl,
        metaRobots: source.metaRobots,
        aiSummary: source.aiSummary,
        tldr: source.tldr,
        keyTakeaways: source.keyTakeaways,
        faqs: source.faqs ? (source.faqs as Prisma.InputJsonValue) : undefined,
        entities: source.entities
          ? (source.entities as Prisma.InputJsonValue)
          : undefined,
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
    } catch (e) {
      // Audit log error non-blocking
    }
  }
}
