import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DataScopeService } from '../auth/data-scope.service';
import { DocumentType, DocumentStatus, NotificationType } from '@prisma/client';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { ConfigureRequirementDto } from './dto/configure-requirement.dto';
import { RequestCorrectionDto } from './dto/request-correction.dto';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';

export interface DocumentMasterConfig {
  type: DocumentType;
  name: string;
  category: 'IDENTITY' | 'ACADEMIC' | 'ADDRESS' | 'CATEGORY_RESERVATION' | 'FINANCIAL' | 'PERSONAL' | 'MEDICAL' | 'OTHER';
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  mandatory: boolean;
  applicableEducationLevels?: ('TENTH' | 'TWELFTH' | 'UNDERGRADUATE' | 'POSTGRADUATE' | 'DIPLOMA')[];
  applicableCourseLevels?: ('UNDERGRADUATE' | 'POSTGRADUATE' | 'DIPLOMA' | 'DOCTORAL' | 'ALL')[];
  description?: string;
}

export const DOCUMENT_MASTER: DocumentMasterConfig[] = [
  {
    type: DocumentType.TENTH_MARKSHEET,
    name: '10th Marksheet & Certificate',
    category: 'ACADEMIC',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: true,
    applicableEducationLevels: ['TENTH', 'TWELFTH', 'UNDERGRADUATE', 'POSTGRADUATE', 'DIPLOMA'],
    applicableCourseLevels: ['ALL'],
    description: 'Secondary School Examination marksheet showing DOB and subject marks.',
  },
  {
    type: DocumentType.TWELFTH_MARKSHEET,
    name: '12th Marksheet & Certificate',
    category: 'ACADEMIC',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: true,
    applicableEducationLevels: ['TWELFTH', 'UNDERGRADUATE', 'POSTGRADUATE'],
    applicableCourseLevels: ['UNDERGRADUATE', 'POSTGRADUATE'],
    description: 'Higher Secondary / Intermediate certificate with marks breakdown.',
  },
  {
    type: DocumentType.GRADUATION,
    name: 'Graduation Degree / Marksheet',
    category: 'ACADEMIC',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableEducationLevels: ['UNDERGRADUATE', 'POSTGRADUATE'],
    applicableCourseLevels: ['POSTGRADUATE', 'DOCTORAL'],
    description: 'Bachelor degree certificate or semester consolidated grade sheet.',
  },
  {
    type: DocumentType.DIPLOMA,
    name: 'Diploma Certificate',
    category: 'ACADEMIC',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableEducationLevels: ['DIPLOMA'],
    applicableCourseLevels: ['UNDERGRADUATE', 'DIPLOMA'],
    description: 'Polytechnic or Technical Diploma certificate.',
  },
  {
    type: DocumentType.AADHAAR,
    name: 'Aadhaar Card',
    category: 'IDENTITY',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: true,
    applicableCourseLevels: ['ALL'],
    description: 'Government issued Aadhaar identification card (masked numbers safe).',
  },
  {
    type: DocumentType.PAN,
    name: 'PAN Card',
    category: 'IDENTITY',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Permanent Account Number card for identity verification.',
  },
  {
    type: DocumentType.PHOTO,
    name: 'Photograph',
    category: 'PERSONAL',
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxSizeBytes: 300 * 1024,
    mandatory: true,
    applicableCourseLevels: ['ALL'],
    description: 'Recent colored candidate photograph with light background.',
  },
  {
    type: DocumentType.SIGNATURE,
    name: 'Specimen Signature',
    category: 'PERSONAL',
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Candidate handwritten signature on clean white paper.',
  },
  {
    type: DocumentType.MIGRATION,
    name: 'Migration Certificate',
    category: 'ACADEMIC',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Board or University institutional migration certificate.',
  },
  {
    type: DocumentType.TRANSFER_CERTIFICATE,
    name: 'Transfer Certificate (TC)',
    category: 'ACADEMIC',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'School or college transfer / leaving certificate.',
  },
  {
    type: DocumentType.CHARACTER_CERTIFICATE,
    name: 'Character Certificate',
    category: 'ACADEMIC',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Conduct and character certificate from last attended institution.',
  },
  {
    type: DocumentType.CASTE_CERTIFICATE,
    name: 'Caste / Reservation Certificate',
    category: 'CATEGORY_RESERVATION',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Authorized state authority caste or community certificate (SC/ST/OBC).',
  },
  {
    type: DocumentType.EWS_CERTIFICATE,
    name: 'EWS Certificate',
    category: 'CATEGORY_RESERVATION',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Economically Weaker Section certificate for reservation benefits.',
  },
  {
    type: DocumentType.INCOME_CERTIFICATE,
    name: 'Income Certificate',
    category: 'FINANCIAL',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Parental family annual income certificate for scholarships and fee concessions.',
  },
  {
    type: DocumentType.DOMICILE,
    name: 'Domicile / Residence Certificate',
    category: 'ADDRESS',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'State domicile or permanent residence certificate for quota eligibility.',
  },
  {
    type: DocumentType.MEDICAL_CERTIFICATE,
    name: 'Medical Fitness Certificate',
    category: 'MEDICAL',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Registered medical practitioner fitness and blood group certification.',
  },
  {
    type: DocumentType.GAP_CERTIFICATE,
    name: 'Gap Year Affidavit',
    category: 'OTHER',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Notarized affidavit explaining academic education study gap.',
  },
  {
    type: DocumentType.OTHER,
    name: 'Other Supporting Document',
    category: 'OTHER',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 300 * 1024,
    mandatory: false,
    applicableCourseLevels: ['ALL'],
    description: 'Miscellaneous certificates or institutional endorsements.',
  },
];

import { SystemConfigurationService } from '../settings/system-configuration.service';
import { DocumentVaultStorageService } from './document-vault-storage.service';
import { DocumentWatermarkService } from './document-watermark.service';
import { DocumentAuditService, AuditQueryFilters } from './document-audit.service';
import {
  DocumentRetentionService,
  CreateDeletionRequestDto,
  ReviewDeletionDto,
} from './document-retention.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private dataScopeService: DataScopeService,
    private configService: SystemConfigurationService,
    private vaultStorage: DocumentVaultStorageService,
    private watermarkService: DocumentWatermarkService,
    private auditService: DocumentAuditService,
    private retentionService: DocumentRetentionService,
  ) {}

  /**
   * Calculate SHA-256 Hash of buffer
   */
  private calculateHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Mock OCR Extractor
   */
  private mockOcrExtraction(fileName: string, originalName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return {
      extractedName: 'Verified Student',
      extractedFatherName: 'Guardian Name',
      extractedDOB: new Date('2004-05-15'),
      extractedRollNo: 'ROLL-' + Math.floor(100000 + Math.random() * 900000),
      extractedBoard: 'CBSE Board',
      extractedYear: 2022,
      extractedMarks: 88.5,
      confidenceScore: 0.94,
    };
  }

  /**
   * Mock AI Verification Quality Score
   */
  private mockAiAnalysis() {
    return {
      aiVerificationScore: 92.5,
      duplicateProbability: 0.05,
      qualityScore: 96.0,
      blurScore: 0.02,
      cropScore: 0.01,
    };
  }

  /**
   * Upload or replace document
   */
  async upload(
    userId: string,
    dto: UploadDocumentDto,
    file: Express.Multer.File,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const MAX_DOC_SIZE_BYTES = 300 * 1024; // 300 KB strict limit
    if (file.size && file.size > MAX_DOC_SIZE_BYTES) {
      throw new BadRequestException('File size must not exceed 300 KB.');
    }

    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (file.mimetype && !allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPG, JPEG, and PNG files are allowed.');
    }

    // Store in Private Protected Vault
    const vaultResult = await this.vaultStorage.storeDocument(
      file.buffer,
      userId,
      file.originalname,
    );
    const fileUrl = vaultResult.storageKey;
    const fileHash = vaultResult.checksum;
    const fileExtension =
      file.originalname.split('.').pop()?.toLowerCase() || '';

    // OCR & AI extraction
    const ocrData = this.mockOcrExtraction(
      file.filename || file.originalname,
      file.originalname,
    );
    const aiData = this.mockAiAnalysis();

    // Application details check
    let collegeId: string | undefined;
    let courseId: string | undefined;
    let counselorId: string | undefined;

    if (dto.applicationId) {
      const app = await this.prisma.application.findUnique({
        where: { id: dto.applicationId },
      });
      if (app) {
        collegeId = app.collegeId || undefined;
        courseId = app.courseId;
        counselorId = app.counselorId || undefined;
      }
    }

    if (!counselorId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      counselorId = user?.assignedCounselorId || undefined;
    }

    const doc = await this.prisma.document.create({
      data: {
        userId,
        applicationId: dto.applicationId,
        collegeId,
        courseId,
        counselorId,
        type: dto.type,
        title: dto.title || dto.type.replace(/_/g, ' '),
        fileName: file.originalname,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        extension: fileExtension,
        status: DocumentStatus.UPLOADED,
        version: 1,
        ...ocrData,
        ...aiData,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, mobile: true },
        },
        application: {
          include: {
            college: { select: { name: true } },
            course: { select: { name: true } },
          },
        },
      },
    });

    // Create Document History
    await this.prisma.documentHistory.create({
      data: {
        documentId: doc.id,
        status: DocumentStatus.UPLOADED,
        remarks: 'Document uploaded to secure vault',
        actionBy: userId,
      },
    });

    // Create Immutable Audit Log
    await this.auditService.logAccess({
      documentId: doc.id,
      studentId: userId,
      applicationId: dto.applicationId,
      actorUserId: userId,
      actorRole: 'STUDENT',
      action: 'UPLOAD',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: {
        type: doc.type,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        checksum: fileHash,
      },
    });

    // Mask internal fileUrl for API response
    (doc as any).fileUrl = `/v1/documents/${doc.id}/preview`;

    return doc;
  }

  /**
   * Get Student's own documents
   */
  async getMyDocuments(userId: string) {
    const documents = await this.prisma.document.findMany({
      where: { userId, deletedAt: null },
      include: {
        application: {
          include: {
            college: { select: { id: true, name: true, logo: true } },
            course: { select: { id: true, name: true } },
          },
        },
        verifier: { select: { id: true, fullName: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    for (const doc of documents) {
      doc.fileUrl = `/v1/documents/${doc.id}/preview`;
    }
    return documents;
  }

  /**
   * Get Documents for a specific user (staff view)
   */
  async getUserDocuments(targetUserId: string, currentUserId?: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { profile: true, counselorProfile: true, applications: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      this.dataScopeService.enforceStudentScope(ctx, targetUser);
    }

    const documents = await this.prisma.document.findMany({
      where: { userId: targetUserId, deletedAt: null },
      include: {
        application: {
          include: {
            college: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
        },
        verifier: { select: { id: true, fullName: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    for (const doc of documents) {
      doc.fileUrl = `/v1/documents/${doc.id}/preview`;
    }
    return documents;
  }

  /**
   * Paginated Search and Filtering for Admin Panel
   */
  async getPaginatedDocuments(query: DocumentQueryDto, currentUserId?: string) {
    const {
      search,
      type,
      status,
      collegeId,
      courseId,
      counselorId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = query;

    const skip = (page - 1) * limit;

    let where: any = {
      deletedAt: null,
    };

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const scopeFilter = this.dataScopeService.buildDocumentScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    if (type) where = { AND: [where, { type }] };
    if (status) where = { AND: [where, { status }] };
    if (collegeId) where = { AND: [where, { collegeId }] };
    if (courseId) where = { AND: [where, { courseId }] };
    if (counselorId) where = { AND: [where, { counselorId }] };

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      where = { AND: [where, { uploadedAt: dateFilter }] };
    }

    if (search) {
      const searchCondition = {
        OR: [
          { user: { fullName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { mobile: { contains: search, mode: 'insensitive' } } },
          {
            application: {
              applicationId: { contains: search, mode: 'insensitive' },
            },
          },
          { fileName: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
        ],
      };
      where = { AND: [where, searchCondition] };
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              mobile: true,
              profile: true,
            },
          },
          application: {
            include: {
              college: { select: { id: true, name: true } },
              course: { select: { id: true, name: true } },
              counselor: { select: { id: true, fullName: true } },
            },
          },
          verifier: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    const slaVerificationHours = await this.configService.getNumber(
      'document.verification.slaHours',
      24,
    );
    const now = new Date();

    const enrichedDocs = await Promise.all(
      documents.map(async (doc: any) => {
        const fileUrl = `/v1/documents/${doc.id}/preview`;
        const uploadedTime = new Date(doc.uploadedAt).getTime();
        const slaDeadline = new Date(
          uploadedTime + slaVerificationHours * 3600 * 1000,
        );
        const hoursRemaining = Number(
          ((slaDeadline.getTime() - now.getTime()) / (3600 * 1000)).toFixed(1),
        );

        let slaStatus: 'ON_TRACK' | 'DUE_SOON' | 'BREACHED' | 'COMPLETED' =
          'ON_TRACK';
        if (doc.status === DocumentStatus.VERIFIED) {
          slaStatus = 'COMPLETED';
        } else if (hoursRemaining < 0) {
          slaStatus = 'BREACHED';
        } else if (hoursRemaining <= 4) {
          slaStatus = 'DUE_SOON';
        }

        return {
          ...doc,
          fileUrl,
          slaDeadline,
          slaStatus,
          hoursRemaining,
        };
      }),
    );

    return {
      data: enrichedDocs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get Document Details by ID
   */
  async getDocumentById(id: string, currentUserId?: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            studentId: true,
            employeeId: true,
            profile: true,
          },
        },
        application: {
          include: {
            college: true,
            course: true,
            counselor: {
              select: { id: true, fullName: true, email: true, mobile: true },
            },
          },
        },
        verifier: { select: { id: true, fullName: true, email: true } },
        history: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      this.dataScopeService.enforceDocumentScope(ctx, document);

      await this.auditService.logAccess({
        documentId: document.id,
        studentId: document.userId,
        applicationId: document.applicationId,
        actorUserId: currentUserId,
        actorRole: ctx.userRole || 'STAFF',
        staffId: currentUserId,
        action: 'VIEW',
        result: 'SUCCESS',
      });
    }

    document.fileUrl = `/v1/documents/${document.id}/preview`;
    return document;
  }

  /**
   * Analytics & Stats for Admin Dashboard Cards
   */
  async getStats(currentUserId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let where: any = { deletedAt: null };
    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      const scopeFilter = this.dataScopeService.buildDocumentScopeFilter(ctx);
      where = { AND: [where, scopeFilter] };
    }

    const [
      totalDocuments,
      pending,
      verified,
      rejected,
      todayUploads,
      sizeAggregation,
      ocrFailed,
      duplicateCount,
    ] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.count({
        where: {
          AND: [
            where,
            {
              status: {
                in: [
                  DocumentStatus.UPLOADED,
                  DocumentStatus.UNDER_VERIFICATION,
                ],
              },
            },
          ],
        },
      }),
      this.prisma.document.count({
        where: { AND: [where, { status: DocumentStatus.VERIFIED }] },
      }),
      this.prisma.document.count({
        where: { AND: [where, { status: DocumentStatus.REJECTED }] },
      }),
      this.prisma.document.count({
        where: { AND: [where, { uploadedAt: { gte: today } }] },
      }),
      this.prisma.document.aggregate({
        where,
        _sum: { fileSize: true },
      }),
      this.prisma.document.count({
        where: { AND: [where, { confidenceScore: { lt: 0.6 } }] },
      }),
      this.prisma.document.count({
        where: { AND: [where, { duplicateProbability: { gt: 0.8 } }] },
      }),
    ]);

    const totalBytes = sizeAggregation._sum.fileSize || 0;
    const storageMb = (totalBytes / (1024 * 1024)).toFixed(2);
    const storageFormatted =
      totalBytes > 1024 * 1024 * 1024
        ? (totalBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
        : storageMb + ' MB';

    return {
      totalDocuments,
      pending,
      verified,
      rejected,
      todayUploads,
      storageUsed: storageFormatted,
      ocrFailed,
      duplicateDocuments: duplicateCount,
    };
  }

  /**
   * Pending documents getter
   */
  async getPendingDocuments(currentUserId?: string) {
    return this.getPaginatedDocuments(
      { status: DocumentStatus.UNDER_VERIFICATION, limit: 50 },
      currentUserId,
    );
  }

  /**
   * Verify or Reject a single document
   */
  async verifyDocument(
    id: string,
    dto: VerifyDocumentDto,
    verifierId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { user: { include: { profile: true } }, application: true },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (verifierId) {
      const ctx = await this.dataScopeService.resolveDataScope(verifierId);
      this.dataScopeService.enforceDocumentScope(ctx, document);
    }

    if (dto.status === DocumentStatus.REJECTED && !dto.rejectedReason) {
      throw new BadRequestException(
        'Rejection reason is required when rejecting a document',
      );
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        status: dto.status,
        verifiedBy: verifierId,
        verifiedAt: new Date(),
        rejectedReason:
          dto.status === DocumentStatus.REJECTED ? dto.rejectedReason : null,
        remarks: dto.remarks || null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    // Create history
    await this.prisma.documentHistory.create({
      data: {
        documentId: id,
        status: dto.status,
        remarks:
          dto.remarks ||
          (dto.status === DocumentStatus.REJECTED
            ? dto.rejectedReason
            : 'Verified'),
        actionBy: verifierId,
      },
    });

    // Create audit
    await this.audit.logAction({
      userId: verifierId,
      action:
        dto.status === DocumentStatus.VERIFIED
          ? 'VERIFY_DOCUMENT'
          : 'REJECT_DOCUMENT',
      entity: 'Document',
      entityId: id,
      oldValue: { status: document.status },
      newValue: {
        status: dto.status,
        remarks: dto.remarks,
        rejectedReason: dto.rejectedReason,
      },
      ipAddress,
      userAgent,
    });

    // Update Application completion & status if linked
    if (document.applicationId) {
      const appDocs = await this.prisma.document.findMany({
        where: { applicationId: document.applicationId, deletedAt: null },
      });
      const allVerified =
        appDocs.length > 0 &&
        appDocs.every((d) => d.status === DocumentStatus.VERIFIED);

      if (allVerified) {
        await this.prisma.application
          .update({
            where: { id: document.applicationId },
            data: {
              documentsVerified: true,
              status: 'DOCUMENTS_VERIFIED',
            },
          })
          .catch(() => {});
      } else if (dto.status === DocumentStatus.REJECTED) {
        await this.prisma.application
          .update({
            where: { id: document.applicationId },
            data: {
              documentsVerified: false,
              status: 'DOCUMENT_PENDING',
            },
          })
          .catch(() => {});
      }
    }

    // Send Notification to Student
    const notifType =
      dto.status === DocumentStatus.VERIFIED
        ? NotificationType.DOCUMENT_VERIFIED
        : NotificationType.DOCUMENT_REJECTED;

    const notifTitle =
      dto.status === DocumentStatus.VERIFIED
        ? 'Document Approved'
        : 'Document Rejection Alert';

    const notifMsg =
      dto.status === DocumentStatus.VERIFIED
        ? `Your document ${document.type.replace(/_/g, ' ')} has been verified and approved.`
        : `Your document ${document.type.replace(/_/g, ' ')} was rejected. Reason: ${dto.rejectedReason}`;

    await this.notifications
      .sendNotification({
        userId: document.userId,
        type: notifType,
        title: notifTitle,
        message: notifMsg,
      })
      .catch(() => {});

    return updated;
  }

  /**
   * Bulk Verification
   */
  async bulkVerify(
    dto: BulkVerifyDto,
    verifierId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const maxBulkLimit = await this.configService.getNumber(
      'document.bulkActionLimit',
      50,
    );
    if (dto.documentIds && dto.documentIds.length > maxBulkLimit) {
      throw new BadRequestException(
        `Batch size exceeds maximum limit of ${maxBulkLimit} documents per action.`,
      );
    }

    const results: any[] = [];
    for (const docId of dto.documentIds) {
      try {
        const res = await this.verifyDocument(
          docId,
          {
            status: dto.status,
            rejectedReason: dto.rejectedReason,
            remarks: dto.remarks,
          },
          verifierId,
          ipAddress,
          userAgent,
        );
        results.push({ id: docId, success: true, data: res });
      } catch (err: any) {
        results.push({ id: docId, success: false, error: err.message });
      }
    }
    return { processed: results.length, results };
  }


  /**
   * Configure Document Requirement
   */
  async configureRequirement(dto: ConfigureRequirementDto) {
    const existing = await this.prisma.documentRequirement.findFirst({
      where: {
        collegeId: dto.collegeId || null,
        courseId: dto.courseId || null,
        admissionSession: dto.admissionSession || '2026-2027',
        documentType: dto.documentType,
      },
    });

    if (existing) {
      return this.prisma.documentRequirement.update({
        where: { id: existing.id },
        data: {
          isRequired: dto.isRequired ?? true,
          description: dto.description,
        },
      });
    }

    return this.prisma.documentRequirement.create({
      data: {
        collegeId: dto.collegeId,
        courseId: dto.courseId,
        admissionSession: dto.admissionSession || '2026-2027',
        documentType: dto.documentType,
        isRequired: dto.isRequired ?? true,
        description: dto.description,
      },
    });
  }

  /**
   * Get Configured Requirements
   */
  async getRequirements(
    collegeId?: string,
    courseId?: string,
    session: string = '2026-2027',
  ) {
    return this.prisma.documentRequirement.findMany({
      where: {
        OR: [
          {
            collegeId: collegeId || null,
            courseId: courseId || null,
            admissionSession: session,
          },
          { collegeId: null, courseId: null },
        ],
      },
    });
  }

  /**
   * Export Documents Dataset for Admin Report
   */
  async exportDocuments(query: DocumentQueryDto, currentUserId?: string) {
    const paginated = await this.getPaginatedDocuments(
      { ...query, limit: 1000 },
      currentUserId,
    );
    return paginated.data.map((doc) => ({
      ID: doc.id,
      StudentName: doc.user?.fullName || 'N/A',
      StudentEmail: doc.user?.email || 'N/A',
      StudentMobile: doc.user?.mobile || 'N/A',
      ApplicationID: doc.application?.applicationId || 'N/A',
      College: doc.application?.college?.name || 'N/A',
      Course: doc.application?.course?.name || 'N/A',
      Counselor: doc.application?.counselor?.fullName || 'N/A',
      DocumentType: doc.type,
      FileName: doc.fileName,
      Version: doc.version,
      Status: doc.status,
      UploadedAt: doc.uploadedAt,
      VerifiedBy: doc.verifier?.fullName || 'N/A',
      RejectedReason: doc.rejectedReason || '',
    }));
  }

  /**
   * Dynamic Checklist Generator (Education-Aware, Course-Aware, College-Aware)
   */
  async getDynamicChecklist(
    userId: string,
    applicationId?: string,
    collegeId?: string,
    courseId?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('Student user not found');

    let targetCollegeId = collegeId;
    let targetCourseId = courseId;
    let targetCourseLevel = 'UG';
    let appData: any = null;

    if (applicationId) {
      const app = await this.prisma.application.findUnique({
        where: { id: applicationId },
        include: { college: true, course: true, branch: true },
      });
      if (app) {
        appData = app;
        targetCollegeId = app.collegeId || targetCollegeId;
        targetCourseId = app.courseId || targetCourseId;
        if (app.course?.level) {
          targetCourseLevel = app.course.level.toUpperCase();
        }
      }
    } else if (targetCourseId) {
      const course = await this.prisma.course.findUnique({ where: { id: targetCourseId } });
      if (course?.level) {
        targetCourseLevel = course.level.toUpperCase();
      }
    }

    // Determine normalized course and student education level
    const isDiplomaCourse = targetCourseLevel === 'DIPLOMA';
    const isPGorDoctoral = ['PG', 'POSTGRADUATE', 'PHD', 'DOCTORAL'].includes(targetCourseLevel);
    const profile = user.profile;
    const academicFormData = (appData?.formData as any)?.academicInfo || {};
    const personalFormData = (appData?.formData as any)?.personalInfo || {};
    const studentEduLevel = (
      personalFormData.educationLevel ||
      academicFormData.educationLevel ||
      (profile as any)?.educationLevel ||
      ''
    ).trim().toUpperCase();

    const isTenthApplicant = studentEduLevel === '10TH';
    const hasDiploma = !!(
      profile?.diplomaCourse ||
      academicFormData.hasDiploma ||
      academicFormData.diplomaCourse ||
      academicFormData.diplomaCollege
    );
    const isDiplomaApplicant = studentEduLevel === 'DIPLOMA' || isDiplomaCourse || hasDiploma;
    const isPGApplicant = studentEduLevel === 'POSTGRADUATE' || isPGorDoctoral;
    const isLateralEntryUG = hasDiploma && (targetCourseLevel === 'UG' || targetCourseLevel === 'UNDERGRADUATE');

    // 1. Fetch DB configured requirements for this college/course
    const dbReqs = await this.getRequirements(targetCollegeId, targetCourseId);
    const dbReqMap = new Map<DocumentType, boolean>();
    for (const req of dbReqs) {
      dbReqMap.set(req.documentType, req.isRequired);
    }

    // 2. Derive requirements from Master Config (Excluding PASSPORT from normal checklist)
    const checklistDefs = DOCUMENT_MASTER.filter((def) => {
      // Exclude PASSPORT from normal student applications
      if (def.type === DocumentType.PASSPORT) {
        return false;
      }
      return true;
    });

    // 3. Query all student's active documents
    const userDocs = await this.prisma.document.findMany({
      where: { userId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });

    // 4. Build checklist response items with strict education-level requirements
    const checklistItems = checklistDefs.map((def) => {
      // Find matching uploaded document (prefer application-specific if applicationId provided)
      let doc = userDocs.find(
        (d) => d.type === def.type && (applicationId ? d.applicationId === applicationId : true),
      );
      if (!doc) {
        doc = userDocs.find((d) => d.type === def.type);
      }

      let isRequired = false;

      // Caste, EWS, and Specimen Signature are strictly optional
      if (
        def.type === DocumentType.CASTE_CERTIFICATE ||
        def.type === DocumentType.EWS_CERTIFICATE ||
        def.type === DocumentType.SIGNATURE ||
        def.type === DocumentType.PAN
      ) {
        isRequired = false;
      } else if (dbReqMap.has(def.type)) {
        isRequired = dbReqMap.get(def.type)!;
        // Education level overrides for 12th & Diploma:
        if (def.type === DocumentType.TWELFTH_MARKSHEET && (isTenthApplicant || isDiplomaApplicant)) {
          isRequired = false;
        }
        if (def.type === DocumentType.DIPLOMA && isTenthApplicant) {
          isRequired = false;
        }
      } else {
        // Dynamic Requirement Engine Rules by Education Level:
        switch (def.type) {
          case DocumentType.TENTH_MARKSHEET:
            isRequired = true;
            break;
          case DocumentType.PHOTO:
          case DocumentType.AADHAAR:
            isRequired = true;
            break;
          case DocumentType.TWELFTH_MARKSHEET:
            // 10th and Diploma applicants do NOT require 12th marksheet
            isRequired = !isTenthApplicant && !isDiplomaApplicant;
            break;
          case DocumentType.DIPLOMA:
            isRequired = isDiplomaApplicant && !isTenthApplicant;
            break;
          case DocumentType.GRADUATION:
            isRequired = isPGApplicant;
            break;
          default:
            isRequired = false;
            break;
        }
      }


      let status: string = 'NOT_UPLOADED';
      if (doc) {
        status = doc.status;
      }

      return {
        type: def.type,
        name: def.name,
        category: def.category,
        isRequired,
        status,
        documentId: doc?.id || null,
        fileName: doc?.fileName || null,
        fileUrl: doc?.fileUrl || null,
        fileSize: doc?.fileSize || null,
        mimeType: doc?.mimeType || null,
        version: doc?.version || 1,
        uploadedAt: doc?.uploadedAt || null,
        verifiedAt: doc?.verifiedAt || null,
        publicCorrectionReason: doc?.rejectedReason || null,
        description: def.description,
        allowedMimeTypes: def.allowedMimeTypes,
        maxSizeBytes: def.maxSizeBytes,
      };
    });

    // 5. Calculate summary metrics
    const requiredItems = checklistItems.filter((i) => i.isRequired);
    const totalRequired = requiredItems.length;
    const uploadedCount = requiredItems.filter(
      (i) => i.status !== 'NOT_UPLOADED' && i.status !== 'REJECTED',
    ).length;
    const verifiedCount = requiredItems.filter((i) => i.status === 'VERIFIED').length;
    const correctionCount = checklistItems.filter(
      (i) => i.status === 'REJECTED' || (i.publicCorrectionReason && i.status !== 'VERIFIED'),
    ).length;
    const missingCount = requiredItems.filter((i) => i.status === 'NOT_UPLOADED').length;

    const isComplete = uploadedCount >= totalRequired && totalRequired > 0;
    const isVerified = verifiedCount >= totalRequired && totalRequired > 0;
    const completionPercentage =
      totalRequired > 0 ? Math.round((verifiedCount / totalRequired) * 100) : 100;

    return {
      success: true,
      data: {
        checklist: checklistItems,
        summary: {
          totalRequired,
          uploadedCount,
          verifiedCount,
          correctionCount,
          missingCount,
          isComplete,
          isVerified,
          completionPercentage,
        },
      },
    };
  }

  /**
   * Replace an existing document with a new version (Preserves History)
   */
  async replaceDocument(
    id: string,
    userId: string,
    file: Express.Multer.File,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const MAX_DOC_SIZE_BYTES = 300 * 1024; // 300 KB strict limit
    if (file.size && file.size > MAX_DOC_SIZE_BYTES) {
      throw new BadRequestException('File size must not exceed 300 KB.');
    }

    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (file.mimetype && !allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPG, JPEG, and PNG files are allowed.');
    }

    const existing = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Document not found');

    if (existing.userId !== userId) {
      throw new ForbiddenException('You can only replace your own documents.');
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
    const vaultResult = await this.vaultStorage.storeDocument(
      file.buffer,
      userId,
      file.originalname,
    );
    const newFileUrl = vaultResult.storageKey;
    const ocrData = this.mockOcrExtraction(file.filename || file.originalname, file.originalname);
    const aiData = this.mockAiAnalysis();

    const newVersion = (existing.version || 1) + 1;

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        version: newVersion,
        previousVersionId: existing.id,
        fileName: file.originalname,
        fileUrl: newFileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        extension: fileExtension,
        status: DocumentStatus.UNDER_VERIFICATION,
        rejectedReason: null,
        remarks: `Replaced by student (v${newVersion})`,
        ...ocrData,
        ...aiData,
      },
    });

    await this.prisma.documentHistory.create({
      data: {
        documentId: id,
        status: DocumentStatus.UNDER_VERIFICATION,
        remarks: `Replaced with Version ${newVersion}`,
        actionBy: userId,
      },
    });

    await this.auditService.logAccess({
      documentId: id,
      studentId: userId,
      applicationId: existing.applicationId,
      actorUserId: userId,
      actorRole: 'STUDENT',
      action: 'REPLACE',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: {
        version: newVersion,
        fileName: updated.fileName,
        fileSize: file.size,
        checksum: vaultResult.checksum,
      },
    });

    (updated as any).fileUrl = `/v1/documents/${updated.id}/preview`;
    return updated;
  }

  /**
   * Concurrency Safe Document Claim
   */
  async claimDocument(
    id: string,
    reviewerId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { counselor: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    // Concurrency Lock: Check if already claimed by someone else in the last 30 minutes
    if (
      document.counselorId &&
      document.counselorId !== reviewerId &&
      document.updatedAt &&
      Date.now() - new Date(document.updatedAt).getTime() < 30 * 60 * 1000
    ) {
      throw new ConflictException(
        `Document is currently claimed by reviewer ${document.counselor?.fullName || document.counselorId}`,
      );
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        counselorId: reviewerId,
        status:
          document.status === DocumentStatus.UPLOADED
            ? DocumentStatus.UNDER_VERIFICATION
            : document.status,
      },
    });

    await this.prisma.documentHistory.create({
      data: {
        documentId: id,
        status: updated.status,
        remarks: 'Claimed for verification',
        actionBy: reviewerId,
      },
    });

    await this.audit.logAction({
      userId: reviewerId,
      action: 'CLAIM_DOCUMENT',
      entity: 'Document',
      entityId: id,
      newValue: { counselorId: reviewerId },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Request Correction with Separate Student Message & Internal Notes
   */
  async requestCorrection(
    id: string,
    dto: RequestCorrectionDto,
    verifierId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { user: true },
    });
    if (!document) throw new NotFoundException('Document not found');

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.REJECTED,
        rejectedReason: dto.studentMessage,
        remarks: dto.internalNotes || dto.studentMessage,
        verifiedBy: verifierId,
        verifiedAt: new Date(),
      },
    });

    await this.prisma.documentHistory.create({
      data: {
        documentId: id,
        status: DocumentStatus.REJECTED,
        remarks: `Correction Requested: ${dto.studentMessage}`,
        actionBy: verifierId,
      },
    });

    await this.audit.logAction({
      userId: verifierId,
      action: 'DOCUMENT_CORRECTION_REQUESTED',
      entity: 'Document',
      entityId: id,
      oldValue: { status: document.status },
      newValue: {
        status: DocumentStatus.REJECTED,
        studentMessage: dto.studentMessage,
        internalNotes: dto.internalNotes,
      },
      ipAddress,
      userAgent,
    });

    // Notify Student
    await this.notifications
      .createNotification({
        userId: document.userId,
        type: NotificationType.APPLICATION,
        title: 'Document Correction Required',
        message: `Correction required for ${document.type.replace(/_/g, ' ')}: ${dto.studentMessage}`,
      })
      .catch(() => {});

    return updated;
  }

  /**
   * Get Document Full Auditable History
   */
  async getDocumentHistory(id: string, currentUserId?: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Document not found');

    if (currentUserId) {
      const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
      this.dataScopeService.enforceDocumentScope(ctx, doc);
    }

    return this.prisma.documentHistory.findMany({
      where: { documentId: id },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Secure Preview of Document
   * Enforces object-level authorization, server-side watermarking for staff, and audit logging.
   */
  async previewDocument(
    id: string,
    currentUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    if (!currentUserId) {
      throw new ForbiddenException('Authentication required to preview document.');
    }

    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, studentId: true, employeeId: true, role: true, state: true } },
        application: { select: { id: true, collegeId: true, courseId: true, counselorId: true } },
      },
    });

    if (!document) {
      await this.auditService.logAccess({
        documentId: id,
        actorUserId: currentUserId,
        actorRole: 'UNKNOWN',
        action: 'PREVIEW',
        result: 'DENIED',
        ipAddress,
        userAgent,
        reason: 'Document not found or deleted',
      });
      throw new NotFoundException('Document not available.');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });
    if (!currentUser || !currentUser.isActive) {
      await this.auditService.logAccess({
        documentId: id,
        studentId: document.userId,
        actorUserId: currentUserId,
        actorRole: currentUser?.role || 'UNKNOWN',
        action: 'ACCESS_DENIED',
        result: 'DENIED',
        ipAddress,
        userAgent,
        reason: 'User account disabled or not found',
      });
      throw new ForbiddenException('Access denied.');
    }

    const isStudent = currentUser.role === 'STUDENT' && document.userId === currentUserId;
    const isStaff = !isStudent;

    // Enforce Object-Level Authorization
    try {
      if (currentUser.role === 'STUDENT') {
        if (document.userId !== currentUserId) {
          throw new ForbiddenException("You are not authorized to view another student's document.");
        }
      } else {
        const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
        this.dataScopeService.enforceDocumentScope(ctx, document);
      }
    } catch (authError: any) {
      await this.auditService.logAccess({
        documentId: id,
        studentId: document.userId,
        applicationId: document.applicationId,
        actorUserId: currentUserId,
        actorRole: currentUser.role,
        staffId: currentUser.employeeId || (`SWY-STF-${(currentUser.id || '').slice(-6).toUpperCase()}`),
        action: 'ACCESS_DENIED',
        result: 'DENIED',
        ipAddress,
        userAgent,
        reason: authError.message || 'Data scope check failed',
      });
      throw new ForbiddenException('Access denied to requested document.');
    }

    // Retrieve binary from secure private vault
    const rawBuffer = await this.vaultStorage.getDocumentBuffer(document.fileUrl);

    // Dynamic Server-Side Watermark for Staff (Fail-closed)
    let finalBuffer = rawBuffer;
    const staffId = currentUser.employeeId || (`SWY-STF-${(currentUser.id || '').slice(-6).toUpperCase()}`);

    if (isStaff) {
      const wm = await this.watermarkService.watermarkDocument(
        rawBuffer,
        document.mimeType || 'application/pdf',
        {
          staffId,
          applicationId: document.applicationId || undefined,
        },
      );
      finalBuffer = wm.buffer;
    }

    // Record Success Audit
    await this.auditService.logAccess({
      documentId: id,
      studentId: document.userId,
      applicationId: document.applicationId,
      actorUserId: currentUserId,
      actorRole: currentUser.role,
      staffId: isStaff ? staffId : null,
      action: 'PREVIEW',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: {
        isWatermarked: isStaff,
        docType: document.type,
      },
    });

    return {
      buffer: finalBuffer,
      mimeType: document.mimeType || 'application/pdf',
      fileName: document.fileName || `document_${document.id}.pdf`,
    };
  }

  /**
   * Secure Download of Document
   * Enforces object-level authorization, server-side watermarking for staff, and audit logging.
   */
  async downloadDocument(
    id: string,
    currentUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    if (!currentUserId) {
      throw new ForbiddenException('Authentication required to download document.');
    }

    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { id: true, studentId: true, employeeId: true, role: true, state: true } },
        application: { select: { id: true, collegeId: true, courseId: true, counselorId: true } },
      },
    });

    if (!document) {
      await this.auditService.logAccess({
        documentId: id,
        actorUserId: currentUserId,
        actorRole: 'UNKNOWN',
        action: 'DOWNLOAD',
        result: 'DENIED',
        ipAddress,
        userAgent,
        reason: 'Document not found or deleted',
      });
      throw new NotFoundException('Document not available.');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });
    if (!currentUser || !currentUser.isActive) {
      await this.auditService.logAccess({
        documentId: id,
        studentId: document.userId,
        actorUserId: currentUserId,
        actorRole: currentUser?.role || 'UNKNOWN',
        action: 'ACCESS_DENIED',
        result: 'DENIED',
        ipAddress,
        userAgent,
        reason: 'User account disabled or not found',
      });
      throw new ForbiddenException('Access denied.');
    }

    const isStudent = currentUser.role === 'STUDENT' && document.userId === currentUserId;
    const isStaff = !isStudent;

    // Enforce Object-Level Authorization
    try {
      if (currentUser.role === 'STUDENT') {
        if (document.userId !== currentUserId) {
          throw new ForbiddenException("You are not authorized to download another student's document.");
        }
      } else {
        const ctx = await this.dataScopeService.resolveDataScope(currentUserId);
        this.dataScopeService.enforceDocumentScope(ctx, document);
      }
    } catch (authError: any) {
      await this.auditService.logAccess({
        documentId: id,
        studentId: document.userId,
        applicationId: document.applicationId,
        actorUserId: currentUserId,
        actorRole: currentUser.role,
        staffId: currentUser.employeeId || (`SWY-STF-${(currentUser.id || '').slice(-6).toUpperCase()}`),
        action: 'ACCESS_DENIED',
        result: 'DENIED',
        ipAddress,
        userAgent,
        reason: authError.message || 'Data scope check failed',
      });
      throw new ForbiddenException('Access denied to requested document.');
    }

    // Retrieve binary from secure private vault
    const rawBuffer = await this.vaultStorage.getDocumentBuffer(document.fileUrl);

    let finalBuffer = rawBuffer;
    const staffId = currentUser.employeeId || (`SWY-STF-${(currentUser.id || '').slice(-6).toUpperCase()}`);

    if (isStaff) {
      const wm = await this.watermarkService.watermarkDocument(
        rawBuffer,
        document.mimeType || 'application/pdf',
        {
          staffId,
          applicationId: document.applicationId || undefined,
        },
      );
      finalBuffer = wm.buffer;
    }

    // Record Success Download Audit
    await this.auditService.logAccess({
      documentId: id,
      studentId: document.userId,
      applicationId: document.applicationId,
      actorUserId: currentUserId,
      actorRole: currentUser.role,
      staffId: isStaff ? staffId : null,
      action: 'DOWNLOAD',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      metadata: {
        isWatermarked: isStaff,
        docType: document.type,
      },
    });

    const ext = document.extension || document.fileName.split('.').pop() || 'pdf';
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const safeFilename = isStaff
      ? `SWAYAM_ADMISSION_CONFIDENTIAL_DOC_${nowStr}.${ext}`
      : `SWAYAM_DOC_${document.type}_${nowStr}.${ext}`;

    return {
      buffer: finalBuffer,
      mimeType: document.mimeType || 'application/pdf',
      fileName: safeFilename,
    };
  }

  /**
   * Delete Document
   * Server-side authorization: Students cannot directly delete (must use Deletion Request).
   * Admins can delete only if no active retention hold exists.
   */
  async deleteDocument(
    id: string,
    actorUserId: string,
    actorRole: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
    });
    if (!document) {
      throw new NotFoundException('Document not found or already deleted.');
    }

    if (actorRole === 'STUDENT') {
      throw new BadRequestException(
        'Direct document deletion is disabled. Please submit a Document Deletion Request.',
      );
    }

    // Check for active retention holds
    const isHoldActive = await this.retentionService.hasActiveRetentionHold(
      document.id,
      document.applicationId,
      document.userId,
    );
    if (isHoldActive) {
      await this.auditService.logAccess({
        documentId: id,
        studentId: document.userId,
        applicationId: document.applicationId,
        actorUserId,
        actorRole,
        action: 'DELETION_SKIPPED_HOLD',
        result: 'DENIED',
        ipAddress,
        userAgent,
        reason: 'Retention hold blocked deletion attempt.',
      });
      throw new BadRequestException(
        'Cannot delete document: An active legal or administrative retention hold is placed on this document.',
      );
    }

    // Physically delete file from storage vault
    if (document.fileUrl) {
      await this.vaultStorage.deleteDocument(document.fileUrl);
    }

    // Update document record in DB
    await this.prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.DELETED,
        deletedAt: new Date(),
        deletedReason: 'Administrative manual deletion',
        fileUrl: '',
      },
    });

    // Record audit event
    await this.auditService.logAccess({
      documentId: id,
      studentId: document.userId,
      applicationId: document.applicationId,
      actorUserId,
      actorRole,
      action: 'DELETE_EXECUTED',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
      reason: 'Administrative manual deletion',
    });

    return { success: true, message: 'Document permanently deleted.' };
  }

  /**
   * Submit Deletion Request (Student 45-day workflow)
   */
  async submitDeletionRequest(
    userId: string,
    dto: CreateDeletionRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.retentionService.submitDeletionRequest(userId, dto, ipAddress, userAgent);
  }

  /**
   * Get Student's own deletion requests
   */
  async getMyDeletionRequests(userId: string) {
    return this.retentionService.getMyDeletionRequests(userId);
  }

  /**
   * Student cancels deletion request
   */
  async cancelDeletionRequest(
    requestId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.retentionService.cancelDeletionRequest(requestId, userId, ipAddress, userAgent);
  }

  /**
   * Admin lists deletion requests
   */
  async getAdminDeletionRequests(query: {
    status?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.retentionService.getAdminDeletionRequests(query);
  }

  /**
   * Admin reviews deletion request
   */
  async reviewDeletionRequest(
    requestId: string,
    reviewerId: string,
    dto: ReviewDeletionDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.retentionService.reviewDeletionRequest(
      requestId,
      reviewerId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Admin queries document access audit logs
   */
  async getAuditLogs(query: AuditQueryFilters) {
    return this.auditService.getAuditLogs(query);
  }

  /**
   * Manually trigger automatic retention cleanup job
   */
  async triggerRetentionCleanup() {
    return this.retentionService.executeScheduledDeletions();
  }

  /**
   * Set 90-day post-admission auto-retention for confirmed admissions
   */
  async setPostAdmissionRetention(applicationId: string, confirmedAt?: Date) {
    return this.retentionService.setPostAdmissionRetention(applicationId, confirmedAt);
  }

  /**
   * Admin manually resends deletion confirmation notification
   */
  async resendDeletionNotification(
    requestId: string,
    reviewerId: string,
    channels?: string[],
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.retentionService.resendDeletionNotification(
      requestId,
      reviewerId,
      channels,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Admin queries notification delivery logs
   */
  async getNotificationDeliveryLogs(query: {
    studentId?: string;
    requestId?: string;
    channel?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    return this.retentionService.getNotificationDeliveryLogs(query);
  }
}

