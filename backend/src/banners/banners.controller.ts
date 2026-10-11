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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerQueryDto } from './dto/banner-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // ==========================================
  // PUBLIC FRONTEND ENDPOINTS
  // ==========================================

  @Get('public')
  getPublic(@Query('slot') slot?: string) {
    return this.bannersService.getPublicBanners(slot);
  }

  @Get('slots')
  getAvailableSlots() {
    return this.bannersService.getAvailableSlots();
  }

  // ==========================================
  // ADMIN MANAGEMENT ENDPOINTS
  // ==========================================

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  findAll(@Query() query: BannerQueryDto) {
    return this.bannersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  create(@Body() createBannerDto: CreateBannerDto) {
    return this.bannersService.create(createBannerDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
  ) {
    return this.bannersService.update(id, updateBannerDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  toggleStatus(@Param('id') id: string) {
    return this.bannersService.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required for upload');
    }
    return this.bannersService.uploadMedia(file);
  }
}
