import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  // Banners
  async getBanners() {
    return this.prisma.banner.findMany();
  }

  // Testimonials
  async getTestimonials() {
    return this.prisma.testimonial.findMany();
  }

  // Announcements
  async getAnnouncements() {
    return this.prisma.announcement.findMany();
  }
}
