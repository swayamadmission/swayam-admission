import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CookieItemDto } from './dto/legal-policy.dto';

@Injectable()
export class CookieService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveCookies() {
    return this.prisma.cookieItem.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
  }

  async getAllCookies() {
    return this.prisma.cookieItem.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async createCookie(dto: CookieItemDto) {
    return this.prisma.cookieItem.create({
      data: {
        name: dto.name,
        category: dto.category,
        purpose: dto.purpose,
        provider: dto.provider || 'Swayam Admission',
        duration: dto.duration || 'Session',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async updateCookie(id: string, dto: Partial<CookieItemDto>) {
    return this.prisma.cookieItem.update({
      where: { id },
      data: {
        name: dto.name,
        category: dto.category,
        purpose: dto.purpose,
        provider: dto.provider,
        duration: dto.duration,
        isActive: dto.isActive,
      },
    });
  }

  async deleteCookie(id: string) {
    return this.prisma.cookieItem.delete({
      where: { id },
    });
  }
}
