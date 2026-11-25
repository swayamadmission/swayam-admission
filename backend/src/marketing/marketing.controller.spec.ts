import { Test, TestingModule } from '@nestjs/testing';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';

describe('MarketingController', () => {
  let controller: MarketingController;
  let service: MarketingService;

  const mockMarketingService = {
    getStats: jest.fn().mockResolvedValue({ totalCampaigns: 5, activeCampaigns: 3 }),
    getLandingPages: jest.fn().mockResolvedValue([]),
    createLandingPage: jest.fn().mockResolvedValue({ id: 'lp-1', slug: 'btech-2026' }),
    getReferrals: jest.fn().mockResolvedValue([]),
    createReferral: jest.fn().mockResolvedValue({ id: 'ref-1', referralCode: 'SWAYAM50' }),
    findAll: jest.fn().mockResolvedValue({ campaigns: [], meta: { total: 0 } }),
    findOne: jest.fn().mockResolvedValue({ id: 'camp-1' }),
    create: jest.fn().mockResolvedValue({ id: 'camp-1' }),
    update: jest.fn().mockResolvedValue({ id: 'camp-1' }),
    remove: jest.fn().mockResolvedValue({ id: 'camp-1', deletedAt: new Date() }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketingController],
      providers: [
        {
          provide: MarketingService,
          useValue: mockMarketingService,
        },
      ],
    }).compile();

    controller = module.get<MarketingController>(MarketingController);
    service = module.get<MarketingService>(MarketingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get stats', async () => {
    const stats = await controller.getStats();
    expect(stats.totalCampaigns).toBe(5);
    expect(service.getStats).toHaveBeenCalled();
  });

  it('should list campaigns with query params', async () => {
    const query = { page: 1, limit: 10 };
    const res = await controller.findAll(query as any);
    expect(res).toBeDefined();
    expect(service.findAll).toHaveBeenCalledWith(query);
  });
});

