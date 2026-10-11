import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateConsentConfigDto, RecordConsentDto } from './dto/legal-policy.dto';

export interface ActionPolicyRequirement {
  id: string;
  policyType: string;
  slug: string;
  title: string;
  version: string;
  effectiveDate: Date;
  isMandatory: boolean;
}

export interface ActionConsentValidationResult {
  isValid: boolean;
  missingPolicies: string[];
  applicablePolicies: ActionPolicyRequirement[];
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Public/Protected: Get currently published legal policies required for a protected action.
   */
  async getActionRequirements(actionType: string): Promise<{
    actionType: string;
    isMandatory: boolean;
    description: string | null;
    policies: ActionPolicyRequirement[];
  }> {
    const config = await this.prisma.consentConfiguration.findUnique({
      where: { actionType },
    });

    if (!config) {
      return {
        actionType,
        isMandatory: false,
        description: null,
        policies: [],
      };
    }

    const requiredTypes = (config.policyTypes as string[]) || [];
    if (requiredTypes.length === 0) {
      return {
        actionType,
        isMandatory: config.isMandatory,
        description: config.description,
        policies: [],
      };
    }

    // Load currently PUBLISHED policies matching these types
    const publishedPolicies = await this.prisma.legalPolicy.findMany({
      where: {
        policyType: { in: requiredTypes },
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        policyType: true,
        slug: true,
        title: true,
        version: true,
        effectiveDate: true,
      },
    });

    const policies: ActionPolicyRequirement[] = publishedPolicies.map((p) => ({
      id: p.id,
      policyType: p.policyType,
      slug: p.slug,
      title: p.title,
      version: p.version,
      effectiveDate: p.effectiveDate,
      isMandatory: config.isMandatory,
    }));

    return {
      actionType,
      isMandatory: config.isMandatory,
      description: config.description,
      policies,
    };
  }

  /**
   * Admin: Get all Action Consent Configurations
   */
  async getAllConsentConfigurations() {
    const configs = await this.prisma.consentConfiguration.findMany({
      orderBy: { actionType: 'asc' },
    });

    // Augment with current published policy info
    const published = await this.prisma.legalPolicy.findMany({
      where: { status: 'PUBLISHED' },
      select: { policyType: true, title: true, version: true, slug: true },
    });

    const policyMap = new Map<string, any>();
    for (const p of published) {
      policyMap.set(p.policyType, p);
    }

    return configs.map((cfg) => {
      const types = (cfg.policyTypes as string[]) || [];
      const detailedPolicies = types.map((t) => policyMap.get(t) || { policyType: t, title: t, version: 'v1.0' });
      return {
        ...cfg,
        detailedPolicies,
      };
    });
  }

  /**
   * Admin: Update Action Consent Configuration
   */
  async updateConsentConfiguration(dto: UpdateConsentConfigDto, actorUser?: any) {
    const updated = await this.prisma.consentConfiguration.upsert({
      where: { actionType: dto.actionType },
      update: {
        policyTypes: dto.policyTypes,
        isMandatory: dto.isMandatory !== undefined ? dto.isMandatory : true,
        description: dto.description,
        updatedBy: actorUser?.fullName || actorUser?.email || 'Admin',
      },
      create: {
        actionType: dto.actionType,
        policyTypes: dto.policyTypes,
        isMandatory: dto.isMandatory !== undefined ? dto.isMandatory : true,
        description: dto.description,
        updatedBy: actorUser?.fullName || actorUser?.email || 'Admin',
      },
    });

    await this.auditService.logAction({
      module: 'LEGAL_POLICIES',
      action: 'CONSENT_CONFIGURATION_CHANGED',
      entityId: updated.id,
      entityType: 'ConsentConfiguration',
      entityName: updated.actionType,
      userId: actorUser?.id,
      userName: actorUser?.fullName,
      metadata: { actionType: updated.actionType, policyTypes: updated.policyTypes },
    });

    return updated;
  }

  /**
   * Authoritative Server-Side Consent Validation
   * Validates that the user accepted the required published policies for this action.
   */
  async validateActionConsent(
    actionType: string,
    acceptedPolicies?: Array<{
      policyId?: string;
      policyType?: string;
      policyVersion?: string;
    }>,
  ): Promise<ActionConsentValidationResult> {
    const requirement = await this.getActionRequirements(actionType);

    if (!requirement.isMandatory || requirement.policies.length === 0) {
      return {
        isValid: true,
        missingPolicies: [],
        applicablePolicies: requirement.policies,
      };
    }

    if (!acceptedPolicies || acceptedPolicies.length === 0) {
      const missingTitles = requirement.policies.map((p) => p.title);
      return {
        isValid: false,
        missingPolicies: missingTitles,
        applicablePolicies: requirement.policies,
      };
    }

    const acceptedTypeMap = new Map<string, string>(); // policyType -> version
    for (const ap of acceptedPolicies) {
      if (ap.policyType) {
        acceptedTypeMap.set(ap.policyType, ap.policyVersion || '');
      }
    }

    const missingPolicies: string[] = [];
    for (const req of requirement.policies) {
      const acceptedVersion = acceptedTypeMap.get(req.policyType);
      if (!acceptedVersion) {
        missingPolicies.push(req.title);
      }
    }

    return {
      isValid: missingPolicies.length === 0,
      missingPolicies,
      applicablePolicies: requirement.policies,
    };
  }

  /**
   * Record User Consent Acceptance in Database
   */
  async recordConsent(
    userId: string,
    dto: RecordConsentDto,
    contextInfo?: { ipAddress?: string; userAgent?: string },
  ) {
    if (!dto.acceptedPolicies || dto.acceptedPolicies.length === 0) {
      return { count: 0, recorded: [] };
    }

    const now = new Date();
    const createdRecords: any[] = [];

    for (const p of dto.acceptedPolicies) {
      // Find policy ID if not explicitly provided
      let policyId = p.policyId;
      if (!policyId) {
        const found = await this.prisma.legalPolicy.findFirst({
          where: {
            policyType: p.policyType,
            status: 'PUBLISHED',
          },
          select: { id: true },
        });
        if (found) policyId = found.id;
      }

      if (!policyId) {
        continue;
      }

      const record = await this.prisma.policyAcceptance.create({
        data: {
          userId,
          policyId,
          policyType: p.policyType,
          policyVersion: p.policyVersion || 'v1.0',
          accepted: true,
          acceptedAt: now,
          actionContext: dto.actionContext,
          applicationId: dto.applicationId || null,
          documentId: dto.documentId || null,
          paymentId: dto.paymentId || null,
          purchaseId: dto.purchaseId || null,
          deletionRequestId: dto.deletionRequestId || null,
          referralId: dto.referralId || null,
          ipAddress: contextInfo?.ipAddress || null,
          userAgent: contextInfo?.userAgent || null,
        },
      });

      createdRecords.push(record);
    }

    await this.auditService.logAction({
      module: 'LEGAL_POLICIES',
      action: 'CONSENT_RECORDED',
      entityType: 'PolicyAcceptance',
      userId,
      ipAddress: contextInfo?.ipAddress,
      userAgent: contextInfo?.userAgent,
      metadata: {
        actionContext: dto.actionContext,
        count: createdRecords.length,
        applicationId: dto.applicationId,
        paymentId: dto.paymentId,
      },
    });

    return { count: createdRecords.length, records: createdRecords };
  }

  /**
   * Admin: Query Consent Audit Trail Records
   */
  async getConsentRecords(params: {
    actionContext?: string;
    userId?: string;
    policyType?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};
    if (params.actionContext && params.actionContext !== 'ALL') {
      where.actionContext = params.actionContext;
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.policyType && params.policyType !== 'ALL') {
      where.policyType = params.policyType;
    }
    if (params.search) {
      where.OR = [
        { user: { fullName: { contains: params.search, mode: 'insensitive' } } },
        { user: { email: { contains: params.search, mode: 'insensitive' } } },
        { user: { mobile: { contains: params.search, mode: 'insensitive' } } },
        { policy: { title: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const skip = Number(params.skip) || 0;
    const take = Number(params.take) || 25;

    const [total, items] = await Promise.all([
      this.prisma.policyAcceptance.count({ where }),
      this.prisma.policyAcceptance.findMany({
        where,
        skip,
        take,
        orderBy: { acceptedAt: 'desc' },
        include: {
          policy: {
            select: { title: true, slug: true, version: true },
          },
          user: {
            select: { id: true, fullName: true, email: true, mobile: true, role: true },
          },
        },
      }),
    ]);

    return {
      total,
      skip,
      take,
      items,
    };
  }
}
