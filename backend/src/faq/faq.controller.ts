import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';

@Controller('faqs')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // 1. Dashboard Statistics
  @Get('stats')
  getStats() {
    return this.faqService.getDashboardStats();
  }

  // 2. CSV Export
  @Get('export')
  async exportCsv(@Query() query: FaqQueryDto, @Res() res: Response) {
    const csv = await this.faqService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=faqs_export_${Date.now()}.csv`,
    );
    return res.send(csv);
  }

  // 3. Public Paginated List
  @Get('public')
  findPublic(@Query() query: FaqQueryDto) {
    return this.faqService.findPublic(query);
  }

  // 4. Categories List
  @Get('categories')
  getCategories() {
    return this.faqService.getCategories();
  }

  // 5. Popular FAQs
  @Get('popular')
  getPopular(@Query('limit') limit?: string) {
    return this.faqService.getPopular(limit ? parseInt(limit, 10) : 10);
  }

  // 6. Featured FAQs
  @Get('featured')
  getFeatured(@Query('limit') limit?: string) {
    return this.faqService.getFeatured(limit ? parseInt(limit, 10) : 10);
  }

  // 7. Public Detail by Slug
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.faqService.findBySlug(slug);
  }

  // 8. Helpful Feedback
  @Post('slug/:slug/helpful')
  @HttpCode(HttpStatus.OK)
  markHelpful(@Param('slug') slug: string) {
    return this.faqService.markHelpful(slug);
  }

  // 9. Not Helpful Feedback
  @Post('slug/:slug/not-helpful')
  @HttpCode(HttpStatus.OK)
  markNotHelpful(@Param('slug') slug: string) {
    return this.faqService.markNotHelpful(slug);
  }

  // 10. FAQs by Linked Entity
  @Get('entity/:type/:id')
  getByEntity(@Param('type') type: string, @Param('id') entityId: string) {
    return this.faqService.getByEntity(type, entityId);
  }

  // 11. Admin: Find All Paginated
  @Get()
  findAll(@Query() query: FaqQueryDto) {
    return this.faqService.findAll(query);
  }

  // 12. Admin: Find One by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  // 13. Get Related FAQs by ID
  @Get(':id/related')
  getRelated(@Param('id') id: string) {
    return this.faqService.getRelated(id);
  }

  // 14. Create FAQ
  @Post()
  create(@Body() createFaqDto: CreateFaqDto) {
    return this.faqService.create(createFaqDto);
  }

  // 15. Duplicate FAQ
  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.faqService.duplicate(id);
  }

  // 16. Update FAQ
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    return this.faqService.update(id, updateFaqDto);
  }

  // 17. Soft Delete FAQ
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }

  // 18. Restore Soft-Deleted FAQ
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@Param('id') id: string) {
    return this.faqService.restore(id);
  }

  // 19. Bulk Publish
  @Post('bulk/publish')
  @HttpCode(HttpStatus.OK)
  bulkPublish(@Body('ids') ids: string[]) {
    return this.faqService.bulkPublish(ids);
  }

  // 20. Bulk Archive
  @Post('bulk/archive')
  @HttpCode(HttpStatus.OK)
  bulkArchive(@Body('ids') ids: string[]) {
    return this.faqService.bulkArchive(ids);
  }

  // 21. Bulk Soft Delete
  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(@Body('ids') ids: string[]) {
    return this.faqService.bulkDelete(ids);
  }
}
