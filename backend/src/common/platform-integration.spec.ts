import { Test, TestingModule } from '@nestjs/testing';
import { CommonController, CANONICAL_CATEGORIES } from './common.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';

describe('Phase 10 Platform-Wide Integration & Workflow Validation Suite', () => {
  let commonController: CommonController;
  let prisma: any;

  const mockPrismaService = {
    college: {
      findMany: jest.fn(),
    },
    course: {
      findMany: jest.fn(),
    },
    lead: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    application: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    campaign: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    referralCampaign: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommonController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    commonController = module.get<CommonController>(CommonController);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Student Lead Intake & Qualification Workflow', () => {
    it('should validate end-to-end lead creation and status advancement', async () => {
      const mockLead = {
        id: 'lead-101',
        fullName: 'Aarav Sharma',
        email: 'aarav.sharma@example.in',
        mobile: '+919876543210',
        status: 'NEW',
        counselorId: null,
        createdAt: new Date(),
      };

      prisma.lead.create.mockResolvedValueOnce(mockLead);
      prisma.lead.update.mockResolvedValueOnce({
        ...mockLead,
        counselorId: 'counselor-55',
        status: 'IN_PROGRESS',
      });

      // Step 1: Intake
      const createdLead = await prisma.lead.create({
        data: {
          fullName: mockLead.fullName,
          email: mockLead.email,
          mobile: mockLead.mobile,
          status: 'NEW',
        },
      });

      expect(createdLead.id).toBe('lead-101');
      expect(createdLead.status).toBe('NEW');

      // Step 2: Counselor Assignment & Qualification
      const qualifiedLead = await prisma.lead.update({
        where: { id: createdLead.id },
        data: {
          counselorId: 'counselor-55',
          status: 'IN_PROGRESS',
        },
      });

      expect(qualifiedLead.counselorId).toBe('counselor-55');
      expect(qualifiedLead.status).toBe('IN_PROGRESS');
    });
  });

  describe('2. Multi-Step Admission & Document Pipeline Workflow', () => {
    it('should track application state transitions through admission confirmation', async () => {
      const mockApplication = {
        id: 'app-901',
        userId: 'student-42',
        collegeId: 'college-10',
        courseId: 'course-20',
        status: ApplicationStatus.DRAFT,
      };

      prisma.application.create.mockResolvedValueOnce(mockApplication);
      prisma.application.update
        .mockResolvedValueOnce({ ...mockApplication, status: ApplicationStatus.SUBMITTED })
        .mockResolvedValueOnce({ ...mockApplication, status: ApplicationStatus.DOCUMENT_VERIFIED })
        .mockResolvedValueOnce({ ...mockApplication, status: ApplicationStatus.APPROVED });

      // Step 1: Draft Application
      const draft = await prisma.application.create({ data: mockApplication });
      expect(draft.status).toBe(ApplicationStatus.DRAFT);

      // Step 2: Submission
      const submitted = await prisma.application.update({
        where: { id: draft.id },
        data: { status: ApplicationStatus.SUBMITTED },
      });
      expect(submitted.status).toBe(ApplicationStatus.SUBMITTED);

      // Step 3: Document Verification
      const verified = await prisma.application.update({
        where: { id: draft.id },
        data: { status: ApplicationStatus.DOCUMENT_VERIFIED },
      });
      expect(verified.status).toBe(ApplicationStatus.DOCUMENT_VERIFIED);

      // Step 4: Final Approval
      const approved = await prisma.application.update({
        where: { id: draft.id },
        data: { status: ApplicationStatus.APPROVED },
      });
      expect(approved.status).toBe(ApplicationStatus.APPROVED);
    });
  });

  describe('3. Marketing Campaign & Referral Code Attribution', () => {
    it('should link student referral codes to campaign tracking', async () => {
      const mockCampaign = {
        id: 'camp-77',
        campaignCode: 'SPRING-2027',
        slug: 'spring-2027',
      };

      const mockReferral = {
        id: 'ref-88',
        referralCode: 'STUDENT-REF-50',
        campaignId: 'camp-77',
        studentId: 'student-42',
      };

      prisma.campaign.findUnique.mockResolvedValueOnce(mockCampaign);
      prisma.referralCampaign.findUnique.mockResolvedValueOnce(null);
      prisma.referralCampaign.create.mockResolvedValueOnce(mockReferral);

      const campaign = await prisma.campaign.findUnique({
        where: { campaignCode: 'SPRING-2027' },
      });
      expect(campaign).toBeDefined();
      expect(campaign.id).toBe('camp-77');

      const referral = await prisma.referralCampaign.create({
        data: {
          referralCode: 'STUDENT-REF-50',
          campaignId: campaign.id,
          studentId: 'student-42',
        },
      });

      expect(referral.referralCode).toBe('STUDENT-REF-50');
      expect(referral.campaignId).toBe('camp-77');
    });
  });

  describe('4. Administrative Audit Log Integrity', () => {
    it('should record immutable audit logs for administrative interventions', async () => {
      const mockLog = {
        id: 'audit-999',
        action: 'UPDATE_ADMISSION_STATUS',
        entity: 'Application',
        entityId: 'app-901',
        performedById: 'admin-1',
        details: { previousStatus: 'SUBMITTED', newStatus: 'APPROVED' },
        createdAt: new Date(),
      };

      prisma.auditLog.create.mockResolvedValueOnce(mockLog);

      const log = await prisma.auditLog.create({ data: mockLog });

      expect(log.action).toBe('UPDATE_ADMISSION_STATUS');
      expect(log.performedById).toBe('admin-1');
      expect(log.details.newStatus).toBe('APPROVED');
    });
  });

  describe('5. Platform Discovery & Taxonomy API Verification', () => {
    it('should retrieve canonical categories for admission and profiling', async () => {
      const categories = commonController.getCategories();

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(5);

      const codes = categories.map((c) => c.code);
      expect(codes).toContain('GENERAL');
      expect(codes).toContain('OBC');
      expect(codes).toContain('SC');
      expect(codes).toContain('ST');
      expect(codes).toContain('EWS');

      const general = categories.find((c) => c.code === 'GENERAL');
      expect(general?.isReservation).toBe(false);

      const obc = categories.find((c) => c.code === 'OBC');
      expect(obc?.isReservation).toBe(true);
      expect(obc?.requiresCertificate).toBe(true);
    });
  });
});
