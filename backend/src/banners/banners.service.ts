import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerQueryDto } from './dto/banner-query.dto';
import { Prisma } from '@prisma/client';
import { BANNER_SLOT_METADATA } from './banners.constants';

@Injectable()
export class BannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // ==========================================
  // PUBLIC FRONTEND ENDPOINTS
  // ==========================================

  async getPublicBanners(slot?: string) {
    const now = new Date();
    // Allow timezone buffer (up to 24h) so banners scheduled for today show up immediately
    const startWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    // End date should cover the entire calendar day
    const endWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const where: Prisma.BannerWhereInput = {
      isActive: true,
      status: 'ACTIVE',
      AND: [
        {
          OR: [{ startDate: null }, { startDate: { lte: startWindow } }],
        },
        {
          OR: [{ endDate: null }, { endDate: { gte: endWindow } }],
        },
      ],
    };

    if (slot && slot.trim() !== '') {
      where.slot = slot.trim();
    }

    const banners = await this.prisma.banner.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        image: true,
        videoUrl: true,
        mediaType: true,
        buttonText: true,
        buttonUrl: true,
        openInNewTab: true,
        slot: true,
        sortOrder: true,
        priority: true,
      },
    });

    // Ensure imageUrl has proper fallback if image field exists
    return banners.map((b) => ({
      ...b,
      imageUrl: b.imageUrl || b.image || null,
      videoUrl: b.videoUrl || null,
    }));
  }

  // ==========================================
  // ADMIN PANEL ENDPOINTS
  // ==========================================

  getAvailableSlots() {
    return Object.values(BANNER_SLOT_METADATA);
  }

  async findAll(query: BannerQueryDto) {
    const {
      slot,
      search,
      status,
      mediaType,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.BannerWhereInput = {};

    if (slot && slot !== 'ALL') {
      where.slot = slot;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (mediaType && mediaType !== 'ALL') {
      where.mediaType = mediaType;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { subtitle: { contains: q, mode: 'insensitive' } },
        { slot: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ slot: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.banner.count({ where }),
    ]);

    return {
      items: items.map((b) => ({
        ...b,
        imageUrl: b.imageUrl || b.image || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    return {
      ...banner,
      imageUrl: banner.imageUrl || banner.image || null,
    };
  }

  async create(dto: CreateBannerDto) {
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    const mediaType = dto.mediaType || (dto.videoUrl ? 'VIDEO' : 'IMAGE');
    const imageUrl = dto.imageUrl?.trim() || null;
    const videoUrl = dto.videoUrl?.trim() || null;

    if (mediaType === 'IMAGE' && !imageUrl && !dto.title) {
      throw new BadRequestException('Image URL or banner image is required for image banners');
    }

    if (mediaType === 'VIDEO' && !videoUrl) {
      throw new BadRequestException('Video URL is required for video banners');
    }

    const isActive = dto.isActive !== undefined ? dto.isActive : dto.status !== 'INACTIVE';
    const status = dto.status || (isActive ? 'ACTIVE' : 'INACTIVE');

    return this.prisma.banner.create({
      data: {
        title: dto.title?.trim() || null,
        subtitle: dto.subtitle?.trim() || null,
        image: imageUrl,
        imageUrl,
        videoUrl,
        mediaType,
        buttonText: dto.buttonText?.trim() || null,
        buttonUrl: dto.buttonUrl?.trim() || null,
        openInNewTab: dto.openInNewTab ?? false,
        slot: dto.slot,
        type: dto.type || 'BANNER',
        priority: dto.priority ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        startDate,
        endDate,
        status,
        isActive,
      },
    });
  }

  async update(id: string, dto: UpdateBannerDto) {
    const existing = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const startDate =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : existing.startDate;

    const endDate =
      dto.endDate !== undefined
        ? dto.endDate
          ? new Date(dto.endDate)
          : null
        : existing.endDate;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    const mediaType = dto.mediaType ?? existing.mediaType;
    const imageUrl =
      dto.imageUrl !== undefined ? (dto.imageUrl?.trim() || null) : existing.imageUrl;
    const videoUrl =
      dto.videoUrl !== undefined ? (dto.videoUrl?.trim() || null) : existing.videoUrl;

    const isActive =
      dto.isActive !== undefined
        ? dto.isActive
        : dto.status !== undefined
        ? dto.status === 'ACTIVE'
        : existing.isActive;

    const status =
      dto.status !== undefined
        ? dto.status
        : dto.isActive !== undefined
        ? dto.isActive
          ? 'ACTIVE'
          : 'INACTIVE'
        : existing.status;

    return this.prisma.banner.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? (dto.title?.trim() || null) : existing.title,
        subtitle: dto.subtitle !== undefined ? (dto.subtitle?.trim() || null) : existing.subtitle,
        image: imageUrl,
        imageUrl,
        videoUrl,
        mediaType,
        buttonText: dto.buttonText !== undefined ? (dto.buttonText?.trim() || null) : existing.buttonText,
        buttonUrl: dto.buttonUrl !== undefined ? (dto.buttonUrl?.trim() || null) : existing.buttonUrl,
        openInNewTab: dto.openInNewTab !== undefined ? dto.openInNewTab : existing.openInNewTab,
        slot: dto.slot ?? existing.slot,
        priority: dto.priority ?? existing.priority,
        sortOrder: dto.sortOrder ?? existing.sortOrder,
        startDate,
        endDate,
        status,
        isActive,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    return this.prisma.banner.delete({
      where: { id },
    });
  }

  async toggleStatus(id: string) {
    const existing = await this.prisma.banner.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const nextActive = !existing.isActive;
    const nextStatus = nextActive ? 'ACTIVE' : 'INACTIVE';

    return this.prisma.banner.update({
      where: { id },
      data: {
        isActive: nextActive,
        status: nextStatus,
      },
    });
  }

  // ==========================================
  // MEDIA UPLOAD
  // ==========================================

  async uploadMedia(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required for upload');
    }

    const mime = file.mimetype.toLowerCase();
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    if (!isImage && !isVideo) {
      throw new BadRequestException(
        'Invalid file type. Allowed formats: JPEG, PNG, WebP, GIF, SVG, MP4, WebM',
      );
    }

    // Size check
    const maxImageSize = 15 * 1024 * 1024; // 15MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB

    if (isImage && file.size > maxImageSize) {
      throw new BadRequestException('Image file size must not exceed 15MB');
    }

    if (isVideo && file.size > maxVideoSize) {
      throw new BadRequestException('Video file size must not exceed 100MB');
    }

    const uploadedUrl = await this.storage.uploadFile(file, 'banners');

    return {
      success: true,
      url: uploadedUrl,
      mediaType: isVideo ? 'VIDEO' : 'IMAGE',
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
