import {
  Injectable,
  OnModuleInit,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  DEFAULT_LEGAL_POLICIES,
  DEFAULT_CONSENT_CONFIGS,
  DEFAULT_COOKIES,
} from './legal-defaults';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
  CreateNewVersionDto,
} from './dto/legal-policy.dto';

@Injectable()
export class LegalPolicyService implements OnModuleInit {
  private readonly logger = new Logger(LegalPolicyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultsIfEmpty();
  }

  /**
   * Automatically initializes the 16 legal policies, default consent configs,
   * and cookie declarations if database is unseeded.
   */
  async seedDefaultsIfEmpty() {
    try {
      const policyCount = await this.prisma.legalPolicy.count();
      if (policyCount === 0) {
        this.logger.log('Initializing 16 official Swayam Admission legal policies...');
        const now = new Date();
        for (let i = 0; i < DEFAULT_LEGAL_POLICIES.length; i++) {
          const p = DEFAULT_LEGAL_POLICIES[i];
          await this.prisma.legalPolicy.create({
            data: {
              policyType: p.policyType,
              slug: p.slug,
              title: p.title,
              content: p.content,
              version: p.version,
              versionNumber: 1,
              status: 'PUBLISHED',
              effectiveDate: now,
              publishedAt: now,
              createdBy: 'SYSTEM_SEED',
              changeSummary: 'Initial official baseline published version',
            },
          });
        }
        this.logger.log('Successfully seeded 16 legal policies.');
      }

      // Check Consent Configurations
      const configCount = await this.prisma.consentConfiguration.count();
      if (configCount === 0) {
        this.logger.log('Initializing action consent configurations...');
        for (const cfg of DEFAULT_CONSENT_CONFIGS) {
          await this.prisma.consentConfiguration.create({
            data: {
              actionType: cfg.actionType,
              policyTypes: cfg.policyTypes,
              isMandatory: cfg.isMandatory,
              description: cfg.description,
              updatedBy: 'SYSTEM_SEED',
            },
          });
        }
        this.logger.log('Successfully seeded action consent configurations.');
      }

      // Check Cookies
      const cookieCount = await this.prisma.cookieItem.count();
      if (cookieCount === 0) {
        this.logger.log('Initializing official cookie declarations...');
        for (const cookie of DEFAULT_COOKIES) {
          await this.prisma.cookieItem.create({
            data: cookie,
          });
        }
        this.logger.log('Successfully seeded cookie declarations.');
      }
    } catch (err: any) {
      this.logger.error('Error seeding legal policies defaults:', err.message);
    }
  }

  /**
   * Basic server-side HTML/markdown sanitization
   */
  sanitizeContent(raw: string): string {
    if (!raw) return '';
    // Strip script tags, iframe, object, embed, javascript: protocols
    return raw
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:[^"']*/gi, '');
  }

  /**
   * Public: List all currently PUBLISHED policies
   */
  async getPublishedPolicies() {
    return this.prisma.legalPolicy.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        policyType: true,
        slug: true,
        title: true,
        version: true,
        versionNumber: true,
        status: true,
        effectiveDate: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Public: Get currently published policy by slug
   */
  async getPublishedPolicyBySlug(slug: string) {
    const policy = await this.prisma.legalPolicy.findFirst({
      where: {
        slug: slug.toLowerCase(),
        status: 'PUBLISHED',
      },
      orderBy: { versionNumber: 'desc' },
    });

    if (!policy) {
      throw new NotFoundException(`Published legal policy with slug "${slug}" not found`);
    }

    return policy;
  }

  /**
   * Public: Get policy version history by slug
   */
  async getPolicyVersionHistory(slug: string) {
    const policies = await this.prisma.legalPolicy.findMany({
      where: { slug: slug.toLowerCase() },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        policyType: true,
        slug: true,
        title: true,
        version: true,
        versionNumber: true,
        status: true,
        effectiveDate: true,
        publishedAt: true,
        archivedAt: true,
        changeSummary: true,
        createdBy: true,
        updatedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!policies || policies.length === 0) {
      throw new NotFoundException(`No versions found for policy slug "${slug}"`);
    }

    return policies;
  }

  /**
   * Admin: List all policies with optional filter
   */
  async getAllPolicies(status?: string, policyType?: string, search?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (policyType && policyType !== 'ALL') {
      where.policyType = policyType;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { policyType: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.legalPolicy.findMany({
      where,
      orderBy: [
        { policyType: 'asc' },
        { versionNumber: 'desc' },
      ],
    });
  }

  /**
   * Admin: Get policy by ID
   */
  async getPolicyById(id: string) {
    const policy = await this.prisma.legalPolicy.findUnique({
      where: { id },
    });
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    return policy;
  }

  /**
   * Admin: Create new Policy (defaults to DRAFT)
   */
  async createPolicy(dto: CreatePolicyDto, actorUser?: any) {
    const cleanContent = this.sanitizeContent(dto.content);
    const slug = dto.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-');

    // Count existing policies for this policyType to set versionNumber
    const existingCount = await this.prisma.legalPolicy.count({
      where: { policyType: dto.policyType },
    });

    const version = dto.version || `v${existingCount + 1}.0`;
    const versionNumber = existingCount + 1;
    const status = dto.status === 'PUBLISHED' ? 'DRAFT' : (dto.status || 'DRAFT'); // Always create as DRAFT first

    const policy = await this.prisma.legalPolicy.create({
      data: {
        policyType: dto.policyType,
        slug,
        title: dto.title,
        content: cleanContent,
        version,
        versionNumber,
        status,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
        changeSummary: dto.changeSummary || 'Initial draft created',
        createdBy: actorUser?.fullName || actorUser?.email || 'Admin',
        updatedBy: actorUser?.fullName || actorUser?.email || 'Admin',
      },
    });

    await this.auditService.logAction({
      module: 'LEGAL_POLICIES',
      action: 'POLICY_CREATED',
      entityId: policy.id,
      entityType: 'LegalPolicy',
      entityName: policy.title,
      userId: actorUser?.id,
      userName: actorUser?.fullName,
      metadata: { version: policy.version, policyType: policy.policyType, status: policy.status },
    });

    return policy;
  }

  /**
   * Admin: Update Policy
   * IMMUTABILITY RULE: Never overwrite a published policy!
   */
  async updatePolicy(id: string, dto: UpdatePolicyDto, actorUser?: any) {
    const existing = await this.getPolicyById(id);

    if (existing.status === 'PUBLISHED') {
      throw new BadRequestException(
        'Published policies are immutable and cannot be overwritten directly. Please use "Create New Version" or unpublish the policy to make modifications.',
      );
    }

    if (existing.status === 'ARCHIVED') {
      throw new BadRequestException(
        'Archived policies are historical records and cannot be edited.',
      );
    }

    const cleanContent = dto.content !== undefined ? this.sanitizeContent(dto.content) : existing.content;

    const updated = await this.prisma.legalPolicy.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        content: cleanContent,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : existing.effectiveDate,
        changeSummary: dto.changeSummary ?? existing.changeSummary,
        status: dto.status ?? existing.status,
        updatedBy: actorUser?.fullName || actorUser?.email || 'Admin',
      },
    });

    await this.auditService.logAction({
      module: 'LEGAL_POLICIES',
      action: 'POLICY_EDITED',
      entityId: updated.id,
      entityType: 'LegalPolicy',
      entityName: updated.title,
      userId: actorUser?.id,
      userName: actorUser?.fullName,
      metadata: { version: updated.version, policyType: updated.policyType },
    });

    return updated;
  }

  /**
   * Admin: Create New Version from an existing policy
   * Creates a new DRAFT with the specified or incremented version tag.
   */
  async createNewVersion(id: string, dto: CreateNewVersionDto, actorUser?: any) {
    const base = await this.getPolicyById(id);

    // Get max versionNumber for this policyType
    const maxVersionRecord = await this.prisma.legalPolicy.findFirst({
      where: { policyType: base.policyType },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersionNumber = (maxVersionRecord?.versionNumber || base.versionNumber) + 1;
    const cleanContent = this.sanitizeContent(dto.content);

    const newVersion = await this.prisma.legalPolicy.create({
      data: {
        policyType: base.policyType,
        slug: base.slug,
        title: dto.title || base.title,
        content: cleanContent,
        version: dto.version,
        versionNumber: nextVersionNumber,
        status: 'DRAFT',
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
        changeSummary: dto.changeSummary || `New revision ${dto.version} created from ${base.version}`,
        createdBy: actorUser?.fullName || actorUser?.email || 'Admin',
        updatedBy: actorUser?.fullName || actorUser?.email || 'Admin',
      },
    });

    await this.auditService.logAction({
      module: 'LEGAL_POLICIES',
      action: 'POLICY_VERSION_CREATED',
      entityId: newVersion.id,
      entityType: 'LegalPolicy',
      entityName: newVersion.title,
      userId: actorUser?.id,
      userName: actorUser?.fullName,
      metadata: {
        priorPolicyId: base.id,
        priorVersion: base.version,
        newVersion: newVersion.version,
        policyType: newVersion.policyType,
      },
    });

    return newVersion;
  }

  /**
   * Admin: Publish Policy
   * Publishes the target draft and atomically archives any prior PUBLISHED policy of the same policyType.
   */
  async publishPolicy(id: string, actorUser?: any) {
    const target = await this.getPolicyById(id);
    if (target.status === 'PUBLISHED') {
      return target; // already published
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Archive any previously published version of this policyType
      await tx.legalPolicy.updateMany({
        where: {
          policyType: target.policyType,
          status: 'PUBLISHED',
          id: { not: id },
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: now,
          updatedBy: actorUser?.fullName || actorUser?.email || 'Admin',
        },
      });

      // 2. Mark target as PUBLISHED
      const published = await tx.legalPolicy.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: now,
          updatedBy: actorUser?.fullName || actorUser?.email || 'Admin',
        },
      });

      return published;
    }).then(async (result) => {
      await this.auditService.logAction({
        module: 'LEGAL_POLICIES',
        action: 'POLICY_PUBLISHED',
        entityId: result.id,
        entityType: 'LegalPolicy',
        entityName: result.title,
        userId: actorUser?.id,
        userName: actorUser?.fullName,
        metadata: { version: result.version, policyType: result.policyType },
      });

      return result;
    });
  }

  /**
   * Admin: Unpublish Policy (sets to DRAFT)
   */
  async unpublishPolicy(id: string, actorUser?: any) {
    const target = await this.getPolicyById(id);
    if (target.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published policies can be unpublished.');
    }

    const updated = await this.prisma.legalPolicy.update({
      where: { id },
      data: {
        status: 'DRAFT',
        updatedBy: actorUser?.fullName || actorUser?.email || 'Admin',
      },
    });

    await this.auditService.logAction({
      module: 'LEGAL_POLICIES',
      action: 'POLICY_UNPUBLISHED',
      entityId: updated.id,
      entityType: 'LegalPolicy',
      entityName: updated.title,
      userId: actorUser?.id,
      userName: actorUser?.fullName,
      metadata: { version: updated.version, policyType: updated.policyType },
    });

    return updated;
  }

  /**
   * Admin: Archive Policy
   */
  async archivePolicy(id: string, actorUser?: any) {
    const target = await this.getPolicyById(id);
    if (target.status === 'ARCHIVED') {
      return target;
    }

    const updated = await this.prisma.legalPolicy.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        updatedBy: actorUser?.fullName || actorUser?.email || 'Admin',
      },
    });

    await this.auditService.logAction({
      module: 'LEGAL_POLICIES',
      action: 'POLICY_ARCHIVED',
      entityId: updated.id,
      entityType: 'LegalPolicy',
      entityName: updated.title,
      userId: actorUser?.id,
      userName: actorUser?.fullName,
      metadata: { version: updated.version, policyType: updated.policyType },
    });

    return updated;
  }

  /**
   * Get version history for a policy record
   */
  async getVersionsByPolicyId(id: string) {
    const policy = await this.getPolicyById(id);
    return this.prisma.legalPolicy.findMany({
      where: { policyType: policy.policyType },
      orderBy: { versionNumber: 'desc' },
    });
  }
}
