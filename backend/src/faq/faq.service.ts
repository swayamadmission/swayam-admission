import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { AnswerFaqDto } from './dto/answer-faq.dto';
import { SubmitStudentQuestionDto } from './dto/submit-student-question.dto';
import { Prisma, Role } from '@prisma/client';
import { IUser } from '../auth/interfaces/user.interface';

@Injectable()
export class FaqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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

  // ── Content Sanitization ──
  private sanitizeContent(text?: string): string {
    if (!text) return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  // ── Permission Helper ──
  private canPublish(role?: Role): boolean {
    return (
      role === Role.ADMIN ||
      role === Role.SUPER_ADMIN ||
      role === Role.CONTENT_MANAGER
    );
  }

  // ── Entity Validation Helper ──
  private async validateAndCleanEntityRelations(
    dto: CreateFaqDto | UpdateFaqDto,
  ): Promise<Record<string, string | null>> {
    const clean: Record<string, string | null> = {};

    if (dto.collegeId !== undefined) {
      const id = dto.collegeId ? String(dto.collegeId).trim() : '';
      if (!id || id === 'null' || id === 'undefined') {
        clean.collegeId = null;
      } else {
        const exists = await this.prisma.college.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) {
          throw new BadRequestException(`Linked College not found with ID: ${id}`);
        }
        clean.collegeId = id;
      }
    }

    if (dto.courseId !== undefined) {
      const id = dto.courseId ? String(dto.courseId).trim() : '';
      if (!id || id === 'null' || id === 'undefined') {
        clean.courseId = null;
      } else {
        const exists = await this.prisma.course.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) {
          throw new BadRequestException(`Linked Course not found with ID: ${id}`);
        }
        clean.courseId = id;
      }
    }

    if (dto.examId !== undefined) {
      const id = dto.examId ? String(dto.examId).trim() : '';
      if (!id || id === 'null' || id === 'undefined') {
        clean.examId = null;
      } else {
        const exists = await this.prisma.exam.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) {
          throw new BadRequestException(`Linked Exam not found with ID: ${id}`);
        }
        clean.examId = id;
      }
    }

    if (dto.scholarshipId !== undefined) {
      const id = dto.scholarshipId ? String(dto.scholarshipId).trim() : '';
      if (!id || id === 'null' || id === 'undefined') {
        clean.scholarshipId = null;
      } else {
        const exists = await this.prisma.scholarship.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) {
          throw new BadRequestException(`Linked Scholarship not found with ID: ${id}`);
        }
        clean.scholarshipId = id;
      }
    }

    if (dto.blogId !== undefined) {
      const id = dto.blogId ? String(dto.blogId).trim() : '';
      if (!id || id === 'null' || id === 'undefined') {
        clean.blogId = null;
      } else {
        const exists = await this.prisma.blog.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) {
          throw new BadRequestException(`Linked Blog not found with ID: ${id}`);
        }
        clean.blogId = id;
      }
    }

    if (dto.studyMaterialId !== undefined) {
      const id = dto.studyMaterialId ? String(dto.studyMaterialId).trim() : '';
      if (!id || id === 'null' || id === 'undefined') {
        clean.studyMaterialId = null;
      } else {
        const exists = await this.prisma.studyMaterial.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) {
          throw new BadRequestException(`Linked Study Material not found with ID: ${id}`);
        }
        clean.studyMaterialId = id;
      }
    }

    return clean;
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
        where: { status: { in: ['DRAFT', 'PENDING_REVIEW'] }, deletedAt: null },
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
    if (query.category && query.category !== 'All') {
      where.category = { equals: query.category, mode: 'insensitive' };
    }
    if (query.status && query.status !== 'All') {
      where.status = query.status;
    }
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

  // ── Public: Paginated Published List (Student-Safe Projection) ──
  async findPublic(query: FaqQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 30;
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
        { tags: { hasSome: [query.q] } },
      ];
    }
    if (query.category && query.category !== 'All') {
      where.category = { equals: query.category, mode: 'insensitive' };
    }
    if (query.featured === 'true') where.featured = true;
    if (query.language) where.language = query.language;

    const [data, total] = await Promise.all([
      this.prisma.fAQ.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { displayOrder: 'asc' },
          { createdAt: 'desc' },
        ],
        select: {
          id: true,
          question: true,
          answer: true,
          slug: true,
          category: true,
          status: true,
          tags: true,
          language: true,
          featured: true,
          views: true,
          helpfulCount: true,
          notHelpfulCount: true,
          aiSummary: true,
          seoTitle: true,
          seoDescription: true,
          canonicalUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.fAQ.count({ where }),
    ]);

    // Sanitize question and answer outputs
    const safeData = data.map((item) => ({
      ...item,
      question: this.sanitizeContent(item.question),
      answer: this.sanitizeContent(item.answer),
    }));

    return {
      data: safeData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Public Detail by Slug (Student-Safe Projection) ──
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

    const safeAnswer = this.sanitizeContent(faq.answer);
    const safeQuestion = this.sanitizeContent(faq.question);

    // Generate FAQPage JSON-LD
    const schemaOrg = [
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: safeQuestion,
            acceptedAnswer: {
              '@type': 'Answer',
              text: safeAnswer,
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
            name: safeQuestion.substring(0, 60),
            item: `https://swayamadmission.org/faq/${faq.slug}`,
          },
        ],
      },
    ];

    const safeFaq = {
      id: faq.id,
      question: safeQuestion,
      answer: safeAnswer,
      slug: faq.slug,
      category: faq.category,
      tags: faq.tags,
      language: faq.language,
      featured: faq.featured,
      views: faq.views + 1,
      helpfulCount: faq.helpfulCount,
      notHelpfulCount: faq.notHelpfulCount,
      aiSummary: faq.aiSummary,
      seoTitle: faq.seoTitle,
      seoDescription: faq.seoDescription,
      canonicalUrl: faq.canonicalUrl,
      keywords: faq.keywords,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt,
      college: faq.college,
      course: faq.course,
      exam: faq.exam,
      scholarship: faq.scholarship,
      blog: faq.blog,
    };

    return {
      faq: safeFaq,
      relatedFaqs: relatedFaqs.map((r) => ({
        ...r,
        question: this.sanitizeContent(r.question),
      })),
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
  async create(dto: CreateFaqDto, actorUser?: IUser) {
    // 1. Validate and clean entity relations
    const cleanedEntities = await this.validateAndCleanEntityRelations(dto);

    // 2. Validate custom slug or generate unique slug
    let slug = '';
    const rawSlug = (dto.slug || dto.customSlug || '').trim();
    if (rawSlug) {
      slug = this.generateSlug(rawSlug);
      const existingSlug = await this.prisma.fAQ.findUnique({
        where: { slug },
      });
      if (existingSlug) {
        throw new BadRequestException(
          `An FAQ with the slug "${slug}" already exists. Please choose a unique slug.`,
        );
      }
    } else {
      slug = `${this.generateSlug(dto.question)}-${Date.now().toString(36)}`;
    }

    let status = dto.status || 'PUBLISHED';
    // Non-publishing roles can only create DRAFT or PENDING_REVIEW
    if (status === 'PUBLISHED' && actorUser && !this.canPublish(actorUser.role)) {
      status = 'PENDING_REVIEW';
    }

    const question = this.sanitizeContent(dto.question);
    const answer = this.sanitizeContent(dto.answer);

    const faq = await this.prisma.fAQ.create({
      data: {
        ...dto,
        ...cleanedEntities,
        question,
        answer,
        status,
        slug,
        createdBy: actorUser?.id || dto.createdBy || null,
        updatedBy: actorUser?.id || dto.updatedBy || null,
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

    if (actorUser) {
      await this.auditService.logAction({
        module: 'FAQ',
        action: 'FAQ_CREATED',
        description: `Created FAQ: "${faq.question.substring(0, 60)}" with status ${faq.status}`,
        entity: 'FAQ',
        entityId: faq.id,
        userId: actorUser.id,
        userName: actorUser.fullName || actorUser.email,
        status: 'SUCCESS',
      });
    }

    return faq;
  }

  // ── Update ──
  async update(id: string, dto: UpdateFaqDto, actorUser?: IUser) {
    const existing = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`FAQ with ID ${id} not found`);

    if (dto.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      if (actorUser && !this.canPublish(actorUser.role)) {
        throw new ForbiddenException(
          'Only Admins and Content Managers can publish FAQs',
        );
      }
    }

    // 1. Validate and clean entity relations
    const cleanedEntities = await this.validateAndCleanEntityRelations(dto);

    const updateData: any = { ...dto, ...cleanedEntities };

    // 2. Validate custom slug uniqueness if modified
    const rawUpdateSlug = (dto.slug || (dto as any).customSlug || '').trim();
    if (rawUpdateSlug) {
      const targetSlug = this.generateSlug(rawUpdateSlug);
      const existingSlug = await this.prisma.fAQ.findUnique({
        where: { slug: targetSlug },
      });
      if (existingSlug && existingSlug.id !== id) {
        throw new BadRequestException(
          `An FAQ with the slug "${targetSlug}" already exists. Please choose a unique slug.`,
        );
      }
      updateData.slug = targetSlug;
    }

    if (dto.question) updateData.question = this.sanitizeContent(dto.question);
    if (dto.answer) updateData.answer = this.sanitizeContent(dto.answer);
    if (actorUser) updateData.updatedBy = actorUser.id;
    if (dto.entities !== undefined) {
      updateData.entities = dto.entities as Prisma.InputJsonValue;
    }

    const faq = await this.prisma.fAQ.update({
      where: { id },
      data: updateData,
    });

    if (actorUser) {
      await this.auditService.logAction({
        module: 'FAQ',
        action: 'FAQ_UPDATED',
        description: `Updated FAQ: "${faq.question.substring(0, 60)}" (status: ${faq.status})`,
        entity: 'FAQ',
        entityId: faq.id,
        userId: actorUser.id,
        userName: actorUser.fullName || actorUser.email,
        oldData: existing,
        newData: faq,
        status: 'SUCCESS',
      });
    }

    return faq;
  }

  // ── Staff Answer Workflow ──
  async answerQuestion(id: string, dto: AnswerFaqDto, actorUser: IUser) {
    const existing = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`FAQ with ID ${id} not found`);

    let targetStatus = dto.status || 'PENDING_REVIEW';
    if (dto.publishNow) {
      targetStatus = 'PUBLISHED';
    } else if (dto.submitForReview) {
      targetStatus = 'PENDING_REVIEW';
    } else if (dto.status) {
      targetStatus = dto.status;
    } else {
      targetStatus = 'DRAFT';
    }

    if (targetStatus === 'PUBLISHED' && !this.canPublish(actorUser.role)) {
      throw new ForbiddenException(
        'Only Admins and Content Managers can publish FAQs. Your answer has been saved for review.',
      );
    }

    const cleanAnswer = this.sanitizeContent(dto.answer);

    const faq = await this.prisma.fAQ.update({
      where: { id },
      data: {
        answer: cleanAnswer,
        status: targetStatus,
        updatedBy: actorUser.id,
      },
    });

    await this.auditService.logAction({
      module: 'FAQ',
      action: 'FAQ_ANSWER_UPDATED',
      description: `Staff answered/updated FAQ: "${faq.question.substring(0, 60)}" (status: ${faq.status})`,
      entity: 'FAQ',
      entityId: faq.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      status: 'SUCCESS',
    });

    return faq;
  }

  // ── Workflow: Submit for Review ──
  async submitForReview(id: string, actorUser: IUser) {
    const existing = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`FAQ with ID ${id} not found`);

    const faq = await this.prisma.fAQ.update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
        updatedBy: actorUser.id,
      },
    });

    await this.auditService.logAction({
      module: 'FAQ',
      action: 'FAQ_SUBMITTED_FOR_REVIEW',
      description: `Submitted FAQ for review: "${faq.question.substring(0, 60)}"`,
      entity: 'FAQ',
      entityId: faq.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      status: 'SUCCESS',
    });

    return faq;
  }

  // ── Workflow: Publish ──
  async publish(id: string, actorUser: IUser) {
    if (!this.canPublish(actorUser.role)) {
      throw new ForbiddenException(
        'Only Admins and Content Managers can publish FAQs',
      );
    }

    const existing = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`FAQ with ID ${id} not found`);

    const faq = await this.prisma.fAQ.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        updatedBy: actorUser.id,
      },
    });

    await this.auditService.logAction({
      module: 'FAQ',
      action: 'FAQ_PUBLISHED',
      description: `Published FAQ: "${faq.question.substring(0, 60)}"`,
      entity: 'FAQ',
      entityId: faq.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      status: 'SUCCESS',
    });

    return faq;
  }

  // ── Workflow: Unpublish ──
  async unpublish(id: string, actorUser: IUser) {
    if (!this.canPublish(actorUser.role)) {
      throw new ForbiddenException(
        'Only Admins and Content Managers can unpublish FAQs',
      );
    }

    const existing = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`FAQ with ID ${id} not found`);

    const faq = await this.prisma.fAQ.update({
      where: { id },
      data: {
        status: 'DRAFT',
        updatedBy: actorUser.id,
      },
    });

    await this.auditService.logAction({
      module: 'FAQ',
      action: 'FAQ_UNPUBLISHED',
      description: `Unpublished FAQ: "${faq.question.substring(0, 60)}"`,
      entity: 'FAQ',
      entityId: faq.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      status: 'SUCCESS',
    });

    return faq;
  }

  // ── Workflow: Archive ──
  async archive(id: string, actorUser: IUser) {
    if (!this.canPublish(actorUser.role)) {
      throw new ForbiddenException(
        'Only Admins and Content Managers can archive FAQs',
      );
    }

    const existing = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`FAQ with ID ${id} not found`);

    const faq = await this.prisma.fAQ.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        updatedBy: actorUser.id,
      },
    });

    await this.auditService.logAction({
      module: 'FAQ',
      action: 'FAQ_ARCHIVED',
      description: `Archived FAQ: "${faq.question.substring(0, 60)}"`,
      entity: 'FAQ',
      entityId: faq.id,
      userId: actorUser.id,
      userName: actorUser.fullName || actorUser.email,
      status: 'SUCCESS',
    });

    return faq;
  }

  // ── Soft Delete ──
  async remove(id: string, actorUser?: IUser) {
    if (actorUser && !this.canPublish(actorUser.role)) {
      throw new ForbiddenException(
        'Only Admins and Content Managers can delete FAQs',
      );
    }

    const faq = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException(`FAQ with ID ${id} not found`);

    await this.prisma.fAQ.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: actorUser?.id || faq.updatedBy,
      },
    });

    if (actorUser) {
      await this.auditService.logAction({
        module: 'FAQ',
        action: 'FAQ_DELETED',
        description: `Soft-deleted FAQ: "${faq.question.substring(0, 60)}"`,
        entity: 'FAQ',
        entityId: faq.id,
        userId: actorUser.id,
        userName: actorUser.fullName || actorUser.email,
        status: 'SUCCESS',
      });
    }

    return { message: 'FAQ soft-deleted' };
  }

  // ── Restore ──
  async restore(id: string, actorUser?: IUser) {
    if (actorUser && !this.canPublish(actorUser.role)) {
      throw new ForbiddenException(
        'Only Admins and Content Managers can restore FAQs',
      );
    }

    const faq = await this.prisma.fAQ.update({
      where: { id },
      data: {
        deletedAt: null,
        updatedBy: actorUser?.id,
      },
    });

    if (actorUser) {
      await this.auditService.logAction({
        module: 'FAQ',
        action: 'FAQ_UPDATED',
        description: `Restored soft-deleted FAQ: "${faq.question.substring(0, 60)}"`,
        entity: 'FAQ',
        entityId: faq.id,
        userId: actorUser.id,
        userName: actorUser.fullName || actorUser.email,
        status: 'SUCCESS',
      });
    }

    return { message: 'FAQ restored' };
  }

  // ── Duplicate ──
  async duplicate(id: string, actorUser?: IUser) {
    const source = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!source) throw new NotFoundException(`FAQ with ID ${id} not found`);

    const copyData: any = { ...source };
    delete copyData.id;
    delete copyData.createdAt;
    delete copyData.updatedAt;
    delete copyData.slug;
    delete copyData.views;
    delete copyData.helpfulCount;
    delete copyData.notHelpfulCount;
    delete copyData.searchAppearances;
    delete copyData.deletedAt;
    delete copyData.entities;

    const copy = await this.prisma.fAQ.create({
      data: {
        ...copyData,
        entities:
          source.entities !== null
            ? (source.entities as Prisma.InputJsonValue)
            : Prisma.DbNull,
        slug: source.slug + '-copy-' + Date.now().toString(36),
        question: `${source.question} (Copy)`,
        status: 'DRAFT',
        views: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
        searchAppearances: 0,
        createdBy: actorUser?.id || source.createdBy,
        updatedBy: actorUser?.id || null,
      },
    });

    if (actorUser) {
      await this.auditService.logAction({
        module: 'FAQ',
        action: 'FAQ_CREATED',
        description: `Duplicated FAQ from "${source.question}" to "${copy.question}"`,
        entity: 'FAQ',
        entityId: copy.id,
        userId: actorUser.id,
        userName: actorUser.fullName || actorUser.email,
        status: 'SUCCESS',
      });
    }

    return copy;
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
          `"${r.id}","${r.question.replace(/"/g, '""')}","${r.category}","${(r.tags || []).join(';')}","${r.status}","${r.featured}","${r.views}","${r.helpfulCount}","${r.notHelpfulCount}","${r.createdAt ? new Date(r.createdAt).toISOString() : ''}"`,
      )
      .join('\n');
    return header + csv;
  }

  // ── Bulk Operations ──
  async bulkPublish(ids: string[], actorUser?: IUser) {
    if (actorUser && !this.canPublish(actorUser.role)) {
      throw new ForbiddenException(
        'Only Admins and Content Managers can bulk publish FAQs',
      );
    }
    await this.prisma.fAQ.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'PUBLISHED',
        updatedBy: actorUser?.id,
      },
    });
    return { message: `${ids.length} FAQs published` };
  }

  async bulkArchive(ids: string[], actorUser?: IUser) {
    if (actorUser && !this.canPublish(actorUser.role)) {
      throw new ForbiddenException(
        'Only Admins and Content Managers can bulk archive FAQs',
      );
    }
    await this.prisma.fAQ.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'ARCHIVED',
        updatedBy: actorUser?.id,
      },
    });
    return { message: `${ids.length} FAQs archived` };
  }

  async bulkDelete(ids: string[], actorUser?: IUser) {
    if (actorUser && !this.canPublish(actorUser.role)) {
      throw new ForbiddenException(
        'Only Admins and Content Managers can bulk delete FAQs',
      );
    }
    await this.prisma.fAQ.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        updatedBy: actorUser?.id,
      },
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
    const faqs = await this.prisma.fAQ.findMany({
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
    return faqs.map((f) => ({
      ...f,
      question: this.sanitizeContent(f.question),
    }));
  }

  // ── Featured ──
  async getFeatured(limit: number = 10) {
    const faqs = await this.prisma.fAQ.findMany({
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
    return faqs.map((f) => ({
      ...f,
      question: this.sanitizeContent(f.question),
      answer: this.sanitizeContent(f.answer),
    }));
  }

  // ── Related by ID ──
  async getRelated(id: string) {
    const faq = await this.prisma.fAQ.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException('FAQ not found');

    const faqs = await this.prisma.fAQ.findMany({
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

    return faqs.map((f) => ({
      ...f,
      question: this.sanitizeContent(f.question),
    }));
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

    const items = await this.prisma.fAQ.findMany({
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

    return items.map((i) => ({
      ...i,
      question: this.sanitizeContent(i.question),
      answer: this.sanitizeContent(i.answer),
    }));
  }

  // ── Record View with Anti-Duplication Support ──
  async recordView(slug: string) {
    const faq = await this.prisma.fAQ.findUnique({
      where: { slug },
      select: { id: true, status: true, deletedAt: true },
    });
    if (!faq || faq.deletedAt || faq.status !== 'PUBLISHED') {
      throw new NotFoundException('FAQ not found or not published');
    }

    const updated = await this.prisma.fAQ.update({
      where: { id: faq.id },
      data: { views: { increment: 1 } },
      select: { id: true, views: true },
    });

    return { success: true, views: updated.views };
  }

  // ── Student: Ask a Question ──
  async submitStudentQuestion(dto: SubmitStudentQuestionDto, user: IUser) {
    if (!user || !user.id) {
      throw new ForbiddenException(
        'You must be logged in as an authenticated student to submit a question.',
      );
    }

    const question = this.sanitizeContent(dto.question);
    if (!question || question.length < 5) {
      throw new BadRequestException('Question must be at least 5 characters long.');
    }
    if (question.length > 500) {
      throw new BadRequestException('Question cannot exceed 500 characters.');
    }

    const category = dto.category?.trim() || 'General';

    // 1. Rate Limiting: Max 10 questions per student per 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSubmissionsCount = await this.prisma.fAQ.count({
      where: {
        createdBy: user.id,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (recentSubmissionsCount >= 10) {
      throw new BadRequestException(
        'You have reached the daily submission limit (10 questions per 24 hours). Please wait before submitting more questions.',
      );
    }

    // 2. Duplicate Detection: Check for duplicate submission by this user within 24h
    const existingDuplicate = await this.prisma.fAQ.findFirst({
      where: {
        createdBy: user.id,
        question: { equals: question, mode: 'insensitive' },
        createdAt: { gte: oneDayAgo },
        deletedAt: null,
      },
    });

    if (existingDuplicate) {
      throw new BadRequestException(
        'You have already submitted this question recently. Our counselors will review and answer it shortly.',
      );
    }

    // 3. Generate safe unique slug
    const slugBase = this.generateSlug(question) || 'question';
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // 4. Initial student note if additional details provided
    const details = dto.additionalDetails
      ? this.sanitizeContent(dto.additionalDetails)
      : '';
    const initialAnswer = details ? `[Student Note]: ${details}` : '';

    const newFaq = await this.prisma.fAQ.create({
      data: {
        question,
        answer: initialAnswer,
        category,
        status: 'PENDING_REVIEW',
        slug,
        createdBy: user.id,
        tags: [category, 'Student Query'],
        priority: 0,
        views: 0,
        helpfulCount: 0,
        notHelpfulCount: 0,
      },
      select: {
        id: true,
        question: true,
        category: true,
        status: true,
        slug: true,
        createdAt: true,
      },
    });

    await this.auditService.logAction({
      module: 'FAQ',
      action: 'FAQ_CREATED',
      description: `Student submitted question: "${question.substring(0, 60)}"`,
      entity: 'FAQ',
      entityId: newFaq.id,
      userId: user.id,
      userName: user.fullName || user.email || 'Student',
      status: 'SUCCESS',
    });

    return {
      success: true,
      message:
        'Your question has been submitted successfully! Our counseling team will review and publish an answer soon.',
      data: newFaq,
    };
  }

  // ── Student: View Own Submitted Questions ──
  async getMyQuestions(user: IUser) {
    if (!user || !user.id) {
      throw new ForbiddenException('Authentication required');
    }

    const items = await this.prisma.fAQ.findMany({
      where: {
        createdBy: user.id,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        status: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Privacy & draft protection:
    // Only return the answer if status === 'PUBLISHED'.
    // If pending review or draft, hide answer so internal drafts / staff notes are never leaked.
    return items.map((item) => ({
      id: item.id,
      question: this.sanitizeContent(item.question),
      category: item.category,
      status: item.status,
      slug: item.slug,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      answer:
        item.status === 'PUBLISHED'
          ? this.sanitizeContent(item.answer)
          : null,
    }));
  }
}

