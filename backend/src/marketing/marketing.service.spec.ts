import { Test, TestingModule } from '@nestjs/testing';
import { MarketingService } from './marketing.service';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignStatus, PaymentStatus } from '@prisma/client';

describe('MarketingService', () => {
  let service: MarketingService;
  let prisma: any;

  const mockPrismaService = {
    campaign: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
    },
    lead: {
      count: jest.fn(),
    },
    application: {
      count: jest.fn(),
    },
    landingPage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    referralCampaign: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MarketingService>(MarketingService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should calculate marketing metrics correctly', async () => {
      prisma.campaign.count
        .mockResolvedValueOnce(10) // totalCampaigns
        .mockResolvedValueOnce(6)  // activeCampaigns
        .mockResolvedValueOnce(3)  // pausedCampaigns
        .mockResolvedValueOnce(1); // completedCampaigns

      prisma.campaign.aggregate
        .mockResolvedValueOnce({ _sum: { totalBudget: 500000, spentAmount: 150000 } })
        .mockResolvedValueOnce({
          _sum: { actualLeads: 250, actualAdmissions: 45, impressions: 50000, clicks: 5000 },
        });

      prisma.payment.aggregate.mockResolvedValueOnce({ _sum: { amount: 900000 } });
      prisma.lead.count.mockResolvedValueOnce(300);
      prisma.application.count.mockResolvedValueOnce(60);

      const stats = await service.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalCampaigns).toBe(10);
      expect(stats.activeCampaigns).toBe(6);
      expect(stats.totalBudget).toBe(500000);
      expect(stats.spentBudget).toBe(150000);
      expect(stats.totalLeads).toBe(300);
      expect(stats.admissions).toBe(60);
      expect(stats.roi).toBeGreaterThan(0);
    });
  });

  describe('createCampaign', () => {
    it('should create a new marketing campaign', async () => {
      const dto = {
        campaignName: 'Fall 2026 Engineering Admissions',
        campaignCode: 'ENG-2026',
        channel: 'GOOGLE_SEARCH',
        targetAudience: '12th Grade Science Students',
        totalBudget: 50000,
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-11-30T00:00:00.000Z',
      };

      prisma.campaign.findUnique.mockResolvedValueOnce(null);
      prisma.campaign.create.mockResolvedValueOnce({
        id: 'camp-123',
        ...dto,
        slug: 'eng-2026',
        status: CampaignStatus.ACTIVE,
        createdAt: new Date(),
      });

      const result = await service.create(dto as any);
      expect(result.id).toBe('camp-123');
      expect(prisma.campaign.create).toHaveBeenCalled();
    });
  });
});
