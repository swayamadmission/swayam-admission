import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { MarketingQueryDto } from './dto/marketing-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get('stats')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  getStats() {
    return this.marketingService.getStats();
  }

  @Get('landing-pages')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getLandingPages() {
    return this.marketingService.getLandingPages();
  }

  @Post('landing-pages')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createLandingPage(
    @Body()
    body: {
      title: string;
      slug: string;
      heroTitle?: string;
      heroSubtitle?: string;
      campaignId?: string;
    },
  ) {
    return this.marketingService.createLandingPage(body);
  }

  @Get('referrals')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getReferrals() {
    return this.marketingService.getReferrals();
  }

  @Post('referrals')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createReferral(
    @Body()
    body: {
      referralCode: string;
      studentId?: string;
      campaignId?: string;
    },
  ) {
    return this.marketingService.createReferral(body);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  findAll(@Query() query: MarketingQueryDto) {
    return this.marketingService.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  findOne(@Param('id') id: string) {
    return this.marketingService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  create(@Body() createCampaignDto: CreateCampaignDto) {
    return this.marketingService.create(createCampaignDto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    return this.marketingService.update(id, updateCampaignDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.marketingService.remove(id);
  }
}
