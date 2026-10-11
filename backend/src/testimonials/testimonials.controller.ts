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
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { TestimonialQueryDto } from './dto/testimonial-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  // ── Public Student Endpoints ──────────────────────────────────────────────
  @Get()
  findPublic(
    @Query('limit') limit?: string,
    @Query('featured') featured?: string,
  ) {
    return this.testimonialsService.findPublic(
      limit ? parseInt(limit, 10) : 10,
      featured === 'true' ? true : featured === 'false' ? false : undefined,
    );
  }

  // ── Admin Protected Endpoints ─────────────────────────────────────────────
  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('testimonials.view', 'success-stories.view')
  findAdmin(@Query() query: TestimonialQueryDto) {
    return this.testimonialsService.findAdmin(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('testimonials.view', 'success-stories.view')
  getStats() {
    return this.testimonialsService.getStats();
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('testimonials.export', 'success-stories.export')
  async exportCsv(@Res() res: Response) {
    const stories = await this.testimonialsService.findAdmin({ limit: 1000 });
    const rows = [
      ['ID', 'Name', 'Role', 'College', 'Course', 'Status', 'Rating', 'Created At'],
      ...(stories.data || []).map((s: any) => [
        s.id,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.role || '').replace(/"/g, '""')}"`,
        `"${(s.college || '').replace(/"/g, '""')}"`,
        `"${(s.course || '').replace(/"/g, '""')}"`,
        s.status,
        s.rating,
        s.createdAt,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="testimonials_export.csv"',
    );
    return res.send(csv);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.testimonialsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('testimonials.create', 'success-stories.create')
  create(@Body() dto: CreateTestimonialDto) {
    return this.testimonialsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('testimonials.edit', 'success-stories.edit')
  update(@Param('id') id: string, @Body() dto: UpdateTestimonialDto) {
    return this.testimonialsService.update(id, dto);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('testimonials.approve', 'success-stories.approve')
  @HttpCode(HttpStatus.OK)
  publish(@Param('id') id: string) {
    return this.testimonialsService.publish(id);
  }

  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('testimonials.approve', 'success-stories.approve')
  @HttpCode(HttpStatus.OK)
  unpublish(@Param('id') id: string) {
    return this.testimonialsService.unpublish(id);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('testimonials.delete', 'success-stories.delete')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string) {
    return this.testimonialsService.archive(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('testimonials.delete', 'success-stories.delete')
  @HttpCode(HttpStatus.OK)
  delete(@Param('id') id: string) {
    return this.testimonialsService.delete(id);
  }
}
