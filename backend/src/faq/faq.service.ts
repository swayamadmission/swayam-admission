import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Slug Generator ──
  private generateSlug(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 120)
      .replace(/^-|-$/g, '');
  }

  // ── Dashboard Statistics ──
  async getDashboardStats() {
    const [
      totalFaqs,
      publishedFaqs,
      draftFaqs,
      featuredFaqs,
      totalViews,
      totalHelpful,
      totalNotHelpful,
      categoriesRaw,
    ] = await Promise.all([
      this.prisma.fAQ.count({ where: { deletedAt: null } }),
      this.prisma.fAQ.count({
        where: { status: 'PUBLISHED', deletedAt: null },
      }),
      this.prisma.fAQ.count({
        where: { status: 'DRAFT', deletedAt: null },
      }),
      this.prisma.fAQ.count({
        where: { featured: true, deletedAt: null },
      }),
      this.prisma.fAQ.aggregate({
        _sum: { views: true },
        where: { deletedAt: null },
      }),
      this.prisma.fAQ.aggregate({
        _sum: { helpfulCount: true },
        where: { deletedAt: null },
      }),
      this.prisma.fAQ.aggregate({
        _sum: { notHelpfulCount: true },
        where: { deletedAt: null },
      }),
      this.prisma.fAQ.groupBy({
        by: ['category'],
        _count: true,
        where: { deletedAt: null },
      }),
    ]);

    const views = totalViews._sum.views || 0;
    const helpful = totalHelpful._sum.helpfulCount || 0;
    const notHelpful = totalNotHelpful._sum.notHelpfulCount || 0;

    return {
      totalFaqs,
      publishedFaqs,
      draftFaqs,
      featuredFaqs,
      totalViews: views,
      avgHelpfulPercent:
        helpful + notHelpful > 0
          ? Math.round((helpful / (helpful + notHelpful)) * 100)
          : 100,
      categoriesCount: categoriesRaw.length,
      categories: categoriesRaw.map((c) => ({
        category: c.category,
        count:
          typeof c._count === 'number'
            ? c._count
            : (c._count as any)?._all || 0,
      })),
    };
  }

  // ── Admin: Paginated List ──
  async findAll(query: FaqQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FAQWhereInput = { deletedAt: null };

    if (query.q) {
      where.OR = [
        { question: { contains: query.q, mode: 'insensitive' } },
        { answer: { contains: query.q, mode: 'insensitive' } },
        { tags: { hasSome: [query.q] } },
        { keywords: { hasSome: [query.q] } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.featured === 'true') where.featured = true;
    if (query.language) where.language = query.language;
    if (query.tags) {
      const tagsArray = query.tags.split(',').map((t) => t.trim());
      where.tags = { hasSome: tagsArray };
    }
    if (query.collegeId) where.collegeId = query.collegeId;
    if (query.courseId) where.courseId = query.courseId;
    if (query.examId) where.examId = query.examId;
    if (query.scholarshipId) where.scholarshipId = query.scholarshipId;
    if (query.blogId) where.blogId = query.blogId;

    const orderBy: Prisma.FAQOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'priority';
    const sortDir = query.sortOrder === 'asc' ? 'asc' : 'desc';
    if (sortField === 'views') orderBy.views = sortDir;
    else if (sortField === 'createdAt') orderBy.createdAt = sortDir;
    else if (sortField === 'updatedAt') orderBy.updatedAt = sortDir;
    else if (sortField === 'displayOrder') orderBy.displayOrder = sortDir;
    else orderBy.priority = sortDir;

    const [data, total] = await Promise.all([
      this.prisma.fAQ.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          college: { select: { id: true, name: true, slug: true } },
          course: { select: { id: true, name: true, slug: true } },
          exam: { select: { id: true, examName: true, slug: true } },
          scholarship: {
            select: { id: true, scholarshipName: true, slug: true },
          },
          blog: { select: { id: true, title: true, slug: true } },
        },
      }),
      this.prisma.fAQ.count({ where }),
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

  // ── Public: Paginated Published List ──
  async findPublic(query: FaqQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FAQWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
    };

    if (query.q) {
      where.OR = [
        { question: { contains: query.q, mode: 'insensitive' } },
        { answer: { contains: query.q, mode: 'insensitive' } },
        { keywords: { hasSome: [query.q] } },
      ];
    }
    if (query.category) where.category = query.category;
    if (query.featured === 'true') where.featured = true;
    if (query.language) where.language = query.language;

    const [data, total] = await Promise.all([
      this.prisma.fAQ.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { displayOrder: 'asc' }],
        select: {
          id: true,
          question: true,
          answer: true,
          slug: true,
          category: true,
          tags: true,
          language: true,
          featured: true,
          views: true,
          helpfulCount: true,
          notHelpfulCount: true,
          createdAt: true,
        },
      }),
      this.prisma.fAQ.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Public Detail by Slug ──
  async findBySlug(slug: string) {
    const faq = await this.prisma.fAQ.findUnique({
      where: { slug },
      include: {
        college: { select: { id: true, name: true, slug: true } },
        course: { select: { id: true, name: true, slug: true } },
        exam: { select: { id: true, examName: true, slug: true } },
        scholarship: {
          select: { id: true, scholarshipName: true, slug: true },
        },
        blog: { select: { id: true, title: true, slug: true } },
      },
    });

    if (!faq || faq.deletedAt || faq.status !== 'PUBLISHED') {
      throw new NotFoundException(`FAQ not found`);
    }

    // Increment views
    await this.prisma.fAQ.update({
      where: { id: faq.id },
      data: { views: { increment: 1 } },
    });

    // Related FAQs
    const relatedFaqs = await this.prisma.fAQ.findMany({
      where: {
        category: faq.category,
        id: { not: faq.id },
        status: 'PUBLISHED',
        deletedAt: null,
      },
      take: 5,
      orderBy: { views: 'desc' },
      select: {
        id: true,
        question: true,
        slug: true,
        category: true,
        views: true,
      },
    });

    // Related Blogs
    const relatedBlogs = await this.prisma.blog.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        OR: [
          { category: faq.category },
          ...(faq.collegeId ? [{ collegeId: faq.collegeId }] : []),
          ...(faq.courseId ? [{ courseId: faq.courseId }] : []),
          ...(faq.examId ? [{ examId: faq.examId }] : []),
        ],
      },
      take: 4,
      orderBy: { views: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        category: true,
        featuredImage: true,
        readingTime: true,
      },
    });

    // Generate FAQPage JSON-LD
    const schemaOrg = [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://swayamadmission.org',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'FAQs',
            item: 'https://swayamadmission.org/faq',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: faq.question.substring(0, 60),
            item: `https://swayamadmission.org/faq/${faq.slug}`,
          },
        ],
      },
    ];

    return {
      faq: { ...faq, views: faq.views + 1 },
      relatedFaqs,
      relatedBlogs,
      schemaOrg,
    };
  }

  // ── Admin Detail ──
  async findOne(id: string) {
    const faq = await this.prisma.fAQ.findUnique({
      where: { id },
      include: {
        college: { select: { id: true, name: true, slug: true } },
        course: { select: { id: true, name: true, slug: true } },
        exam: { select: { id: true, examName: true, slug: true } },
        scholarship: {
          select: { id: true, scholarshipName: true, slug: true },
        },
        studyMaterial: { select: { id: true, title: true, slug: true } },
        blog: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!faq) throw new NotFoundException(`FAQ with ID ${id} not found`);
    return faq;
  }

  // ── Create ──
  async create(dto: CreateFaqDto) {
    const slug =
      dto.slug ||
      this.generateSlug(dto.question) + '-' + Date.now().toString(36);

    const faq = await this.prisma.fAQ.create({
      data: {
        ...dto,
        slug,
        tags: dto.tags || [],
        keywords: dto.keywords || [],
        searchTerms: dto.searchTerms || [],
        semanticKeywords: dto.semanticKeywords || [],
        entities:
          dto.entities !== undefined
            ? (dto.entities as Prisma.InputJsonValue)
            : Prisma.DbNull,
      },
    });

    return faq;
  }

  // ── Update ──
  async update(id: string, dto: UpdateFaqDto) {
    const existing = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`FAQ with ID ${id} not found`);

    const updateData: any = { ...dto };
    if (dto.entities !== undefined) {
      updateData.entities = dto.entities as Prisma.InputJsonValue;
    }

    const faq = await this.prisma.fAQ.update({
      where: { id },
      data: updateData,
    });

    return faq;
  }

  // ── Soft Delete ──
  async remove(id: string) {
    const faq = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException(`FAQ with ID ${id} not found`);

    await this.prisma.fAQ.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'FAQ soft-deleted' };
  }

  // ── Restore ──
  async restore(id: string) {
    await this.prisma.fAQ.update({
      where: { id },
      data: { deletedAt: null },
    });
    return { message: 'FAQ restored' };
  }

  // ── Duplicate ──
  async duplicate(id: string) {
    const source = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!source) throw new NotFoundException(`FAQ with ID ${id} not found`);

    const {
      id: _id,
      createdAt,
      updatedAt,
      slug,
      views,
      helpfulCount,
      notHelpfulCount,
      searchAppearances,
      deletedAt,
      entities,
      ...rest
    } = source;

    return this.prisma.fAQ.create({
      data: {
        ...rest,
        entities:
          entities !== null
            ? (entities as Prisma.InputJsonValue)
            : Prisma.DbNull,
        slug: slug + '-copy-' + Date.now().toString(36),
        question: `${source.question} (Copy)`,
        status: 'DRAFT',
        views: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        searchAppearances: 0,
      },
    });
  }

  // ── Mark Helpful / Not Helpful ──
  async markHelpful(slug: string) {
    const faq = await this.prisma.fAQ.findUnique({ where: { slug } });
    if (!faq) throw new NotFoundException('FAQ not found');
    return this.prisma.fAQ.update({
      where: { id: faq.id },
      data: { helpfulCount: { increment: 1 } },
    });
  }

  async markNotHelpful(slug: string) {
    const faq = await this.prisma.fAQ.findUnique({ where: { slug } });
    if (!faq) throw new NotFoundException('FAQ not found');
    return this.prisma.fAQ.update({
      where: { id: faq.id },
      data: { notHelpfulCount: { increment: 1 } },
    });
  }

  // ── CSV Export ──
  async exportCsv(query: FaqQueryDto) {
    const result = await this.findAll({ ...query, limit: 10000 });
    const rows = result.data;
    const header =
      'ID,Question,Category,Tags,Status,Featured,Views,Helpful,Not Helpful,Created At\n';
    const csv = rows
      .map(
        (r) =>
          `"${r.id}","${r.question.replace(/"/g, '""')}","${r.category}","${(r.tags || []).join(';')}","${r.status}","${r.featured}","${r.views}","${r.helpfulCount}","${r.notHelpfulCount}","${r.createdAt}"`,
      )
      .join('\n');
    return header + csv;
  }

  // ── Bulk Operations ──
  async bulkPublish(ids: string[]) {
    await this.prisma.fAQ.updateMany({
      where: { id: { in: ids } },
      data: { status: 'PUBLISHED' },
    });
    return { message: `${ids.length} FAQs published` };
  }

  async bulkArchive(ids: string[]) {
    await this.prisma.fAQ.updateMany({
      where: { id: { in: ids } },
      data: { status: 'ARCHIVED' },
    });
    return { message: `${ids.length} FAQs archived` };
  }

  async bulkDelete(ids: string[]) {
    await this.prisma.fAQ.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });
    return { message: `${ids.length} FAQs soft-deleted` };
  }

  // ── Categories ──
  async getCategories() {
    const categories = await this.prisma.fAQ.groupBy({
      by: ['category'],
      _count: true,
      where: { status: 'PUBLISHED', deletedAt: null },
    });
    return categories.map((c) => ({
      category: c.category,
      count:
        typeof c._count === 'number' ? c._count : (c._count as any)?._all || 0,
    }));
  }

  // ── Popular ──
  async getPopular(limit: number = 10) {
    return this.prisma.fAQ.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      orderBy: { views: 'desc' },
      take: limit,
      select: {
        id: true,
        question: true,
        slug: true,
        category: true,
        views: true,
        helpfulCount: true,
      },
    });
  }

  // ── Featured ──
  async getFeatured(limit: number = 10) {
    return this.prisma.fAQ.findMany({
      where: { status: 'PUBLISHED', featured: true, deletedAt: null },
      orderBy: { priority: 'desc' },
      take: limit,
      select: {
        id: true,
        question: true,
        answer: true,
        slug: true,
        category: true,
        views: true,
      },
    });
  }

  // ── Related by ID ──
  async getRelated(id: string) {
    const faq = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('FAQ not found');

    return this.prisma.fAQ.findMany({
      where: {
        category: faq.category,
        id: { not: faq.id },
        status: 'PUBLISHED',
        deletedAt: null,
      },
      take: 5,
      orderBy: { views: 'desc' },
      select: {
        id: true,
        question: true,
        slug: true,
        category: true,
      },
    });
  }

  // ── FAQs by Entity ──
  async getByEntity(type: string, entityId: string) {
    const where: Prisma.FAQWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
    };

    switch (type) {
      case 'college':
        where.collegeId = entityId;
        break;
      case 'course':
        where.courseId = entityId;
        break;
      case 'exam':
        where.examId = entityId;
        break;
      case 'scholarship':
        where.scholarshipId = entityId;
        break;
      case 'blog':
        where.blogId = entityId;
        break;
      case 'study-material':
        where.studyMaterialId = entityId;
        break;
      default:
        throw new BadRequestException(`Invalid entity type: ${type}`);
    }

    return this.prisma.fAQ.findMany({
      where,
      orderBy: { priority: 'desc' },
      take: 20,
      select: {
        id: true,
        question: true,
        answer: true,
        slug: true,
        category: true,
        tags: true,
        views: true,
        helpfulCount: true,
      },
    });
  }
}
