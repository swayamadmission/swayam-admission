import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { TestimonialQueryDto } from './dto/testimonial-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TestimonialsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const count = await this.prisma.testimonial.count();
      if (count === 0) {
        await this.prisma.testimonial.createMany({
          data: [
            {
              name: 'Rahul Sharma',
              role: 'Student',
              course: 'B.Tech – DTU, Delhi',
              college: 'Delhi Technological University (DTU)',
              state: 'Bihar',
              text: 'Swayam Admission helped me find the perfect B.Tech college. The AI counselor suggested exactly what I needed based on my budget and marks!',
              rating: 5,
              image: 'https://images.unsplash.com/photo-1603764377193-75b991876878?w=120&q=80',
              status: 'PUBLISHED',
              featured: true,
              isVerified: true,
            },
            {
              name: 'Priya Singh',
              role: 'Student',
              course: 'MBA – Amity, Noida',
              college: 'Amity University, Noida',
              state: 'Uttar Pradesh',
              text: 'I was so confused between colleges. The counselor call helped me decide in 30 minutes flat. What an amazing platform!',
              rating: 5,
              image: 'https://images.unsplash.com/photo-1769159522162-335b60c8146a?w=120&q=80',
              status: 'PUBLISHED',
              featured: true,
              isVerified: true,
            },
            {
              name: 'Amit Kumar',
              role: 'Student',
              course: 'BCA – Chandigarh University',
              college: 'Chandigarh University',
              state: 'Jharkhand',
              text: 'Free counseling changed my life. Got scholarship guidance too! I highly recommend this to all students from Bihar and UP.',
              rating: 5,
              image: 'https://images.unsplash.com/photo-1758270703662-b7d58bf0a8a2?w=120&q=80',
              status: 'PUBLISHED',
              featured: true,
              isVerified: true,
            },
          ],
        });
      }
    } catch (err) {
      // Non-fatal if table not yet migrated during initial setup
      console.warn('Testimonial bootstrap check:', err?.message || err);
    }
  }

  // ── Public Student Endpoints ──────────────────────────────────────────────
  async findPublic(limit = 10, featured?: boolean) {
    const where: Prisma.TestimonialWhereInput = {
      status: 'PUBLISHED',
    };
    if (featured !== undefined) {
      where.featured = featured;
    }
    const data = await this.prisma.testimonial.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { rating: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
    return { data, total: data.length };
  }

  // ── Admin Endpoints ───────────────────────────────────────────────────────
  async findAdmin(query: TestimonialQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TestimonialWhereInput = {};

    if (query.status && query.status !== 'All') {
      where.status = query.status;
    }

    if (query.state && query.state !== 'All') {
      where.state = { contains: query.state, mode: 'insensitive' };
    }

    if (query.q && query.q.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { course: { contains: q, mode: 'insensitive' } },
        { college: { contains: q, mode: 'insensitive' } },
        { state: { contains: q, mode: 'insensitive' } },
        { text: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.testimonial.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.testimonial.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getStats() {
    const [total, published, draft, archived, featured] = await Promise.all([
      this.prisma.testimonial.count(),
      this.prisma.testimonial.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.testimonial.count({ where: { status: 'DRAFT' } }),
      this.prisma.testimonial.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.testimonial.count({ where: { featured: true } }),
    ]);

    return {
      total,
      published,
      draft,
      archived,
      featured,
    };
  }

  async findById(id: string) {
    const item = await this.prisma.testimonial.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Success story with ID ${id} not found`);
    }
    return item;
  }

  async create(dto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({
      data: {
        name: dto.name.trim(),
        role: dto.role?.trim() || 'Student',
        course: dto.course?.trim() || null,
        college: dto.college?.trim() || null,
        state: dto.state?.trim() || null,
        text: dto.text.trim(),
        rating: dto.rating !== undefined ? Number(dto.rating) : 5,
        image: dto.image?.trim() || null,
        videoUrl: dto.videoUrl?.trim() || null,
        featured: Boolean(dto.featured),
        isVerified: dto.isVerified !== undefined ? Boolean(dto.isVerified) : true,
        status: dto.status || 'PUBLISHED',
      },
    });
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    await this.findById(id);

    return this.prisma.testimonial.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.role !== undefined && { role: dto.role.trim() }),
        ...(dto.course !== undefined && { course: dto.course?.trim() || null }),
        ...(dto.college !== undefined && { college: dto.college?.trim() || null }),
        ...(dto.state !== undefined && { state: dto.state?.trim() || null }),
        ...(dto.text !== undefined && { text: dto.text.trim() }),
        ...(dto.rating !== undefined && { rating: Number(dto.rating) }),
        ...(dto.image !== undefined && { image: dto.image?.trim() || null }),
        ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl?.trim() || null }),
        ...(dto.featured !== undefined && { featured: Boolean(dto.featured) }),
        ...(dto.isVerified !== undefined && { isVerified: Boolean(dto.isVerified) }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async publish(id: string) {
    await this.findById(id);
    return this.prisma.testimonial.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  async unpublish(id: string) {
    await this.findById(id);
    return this.prisma.testimonial.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
  }

  async archive(id: string) {
    await this.findById(id);
    return this.prisma.testimonial.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.testimonial.delete({
      where: { id },
    });
  }
}
