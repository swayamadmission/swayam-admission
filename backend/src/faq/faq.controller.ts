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
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { AnswerFaqDto } from './dto/answer-faq.dto';
import { SubmitStudentQuestionDto } from './dto/submit-student-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('faqs')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // ==========================================
  // PUBLIC STUDENT ENDPOINTS (No Auth Required)
  // Only published, non-deleted FAQs are accessible
  // ==========================================

  // 1. Public Paginated List (Safe Projection)
  @Get('public')
  findPublic(@Query() query: FaqQueryDto) {
    return this.faqService.findPublic(query);
  }

  // 2. Categories List
  @Get('categories')
  getCategories() {
    return this.faqService.getCategories();
  }

  // 3. Popular FAQs
  @Get('popular')
  getPopular(@Query('limit') limit?: string) {
    return this.faqService.getPopular(limit ? parseInt(limit, 10) : 10);
  }

  // 4. Featured FAQs
  @Get('featured')
  getFeatured(@Query('limit') limit?: string) {
    return this.faqService.getFeatured(limit ? parseInt(limit, 10) : 10);
  }

  // 5. Public Detail by Slug (Safe Projection)
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.faqService.findBySlug(slug);
  }

  // 6. Helpful Feedback
  @Post('slug/:slug/helpful')
  @HttpCode(HttpStatus.OK)
  markHelpful(@Param('slug') slug: string) {
    return this.faqService.markHelpful(slug);
  }

  // 7. Not Helpful Feedback
  @Post('slug/:slug/not-helpful')
  @HttpCode(HttpStatus.OK)
  markNotHelpful(@Param('slug') slug: string) {
    return this.faqService.markNotHelpful(slug);
  }

  // 8. FAQs by Linked Entity
  @Get('entity/:type/:id')
  getByEntity(@Param('type') type: string, @Param('id') entityId: string) {
    return this.faqService.getByEntity(type, entityId);
  }

  // 9. Safe View Counter
  @Post('slug/:slug/view')
  @HttpCode(HttpStatus.OK)
  recordView(@Param('slug') slug: string) {
    return this.faqService.recordView(slug);
  }

  // 10. Student: Ask a Question (Authenticated Student only)
  @Post('questions/ask')
  @UseGuards(JwtAuthGuard)
  submitStudentQuestion(
    @Body() dto: SubmitStudentQuestionDto,
    @CurrentUser() user: IUser,
  ) {
    return this.faqService.submitStudentQuestion(dto, user);
  }

  // 11. Student: View Own Submitted Questions (Strict Student Isolation)
  @Get('questions/my')
  @UseGuards(JwtAuthGuard)
  getMyQuestions(@CurrentUser() user: IUser) {
    return this.faqService.getMyQuestions(user);
  }

  // ==========================================
  // ADMIN & AUTHORIZED STAFF ENDPOINTS
  // Protected with JwtAuthGuard and RolesGuard
  // ==========================================

  // 9. Dashboard Statistics
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'SEO_MANAGER',
    'COUNSELOR',
    'SENIOR_COUNSELOR',
    'DIRECTOR',
  )
  getStats() {
    return this.faqService.getDashboardStats();
  }

  // 10. CSV Export
  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER', 'SEO_MANAGER', 'DIRECTOR')
  async exportCsv(@Query() query: FaqQueryDto, @Res() res: Response) {
    const csv = await this.faqService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=faqs_export_${Date.now()}.csv`,
    );
    return res.send(csv);
  }

  // 11. Admin: Find All Paginated
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'SEO_MANAGER',
    'COUNSELOR',
    'SENIOR_COUNSELOR',
    'DIRECTOR',
  )
  findAll(@Query() query: FaqQueryDto) {
    return this.faqService.findAll(query);
  }

  // 12. Admin: Find One by ID
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'SEO_MANAGER',
    'COUNSELOR',
    'SENIOR_COUNSELOR',
    'DIRECTOR',
  )
  findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  // 13. Get Related FAQs by ID
  @Get(':id/related')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'SEO_MANAGER',
    'COUNSELOR',
    'SENIOR_COUNSELOR',
  )
  getRelated(@Param('id') id: string) {
    return this.faqService.getRelated(id);
  }

  // 14. Create FAQ (Admin, Super Admin, Content Manager, Counselors)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'COUNSELOR',
    'SENIOR_COUNSELOR',
  )
  create(@Body() createFaqDto: CreateFaqDto, @CurrentUser() user: IUser) {
    return this.faqService.create(createFaqDto, user);
  }

  // 15. Staff Answer Workflow (Counselors and Admin can draft answers)
  @Post(':id/answer')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'COUNSELOR',
    'SENIOR_COUNSELOR',
  )
  answerQuestionPost(
    @Param('id') id: string,
    @Body() dto: AnswerFaqDto,
    @CurrentUser() user: IUser,
  ) {
    return this.faqService.answerQuestion(id, dto, user);
  }

  @Patch(':id/answer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'COUNSELOR',
    'SENIOR_COUNSELOR',
  )
  answerQuestion(
    @Param('id') id: string,
    @Body() dto: AnswerFaqDto,
    @CurrentUser() user: IUser,
  ) {
    return this.faqService.answerQuestion(id, dto, user);
  }

  // 16. Submit FAQ for Review
  @Post(':id/submit-review')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'COUNSELOR',
    'SENIOR_COUNSELOR',
  )
  submitForReview(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.faqService.submitForReview(id, user);
  }

  // 17. Publish FAQ (Authorized Admin / Content Manager only)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  publish(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.faqService.publish(id, user);
  }

  // 18. Unpublish FAQ (Authorized Admin / Content Manager only)
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  unpublish(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.faqService.unpublish(id, user);
  }

  // 19. Archive FAQ (Authorized Admin / Content Manager only)
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  archive(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.faqService.archive(id, user);
  }

  // 20. Update FAQ
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'SUPER_ADMIN',
    'CONTENT_MANAGER',
    'COUNSELOR',
    'SENIOR_COUNSELOR',
  )
  update(
    @Param('id') id: string,
    @Body() updateFaqDto: UpdateFaqDto,
    @CurrentUser() user: IUser,
  ) {
    return this.faqService.update(id, updateFaqDto, user);
  }

  // 21. Duplicate FAQ
  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  duplicate(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.faqService.duplicate(id, user);
  }

  // 22. Soft Delete FAQ
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  remove(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.faqService.remove(id, user);
  }

  // 23. Restore Soft-Deleted FAQ
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  restore(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.faqService.restore(id, user);
  }

  // 24. Bulk Publish
  @Post('bulk/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  bulkPublish(@Body('ids') ids: string[], @CurrentUser() user: IUser) {
    return this.faqService.bulkPublish(ids, user);
  }

  // 25. Bulk Archive
  @Post('bulk/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  bulkArchive(@Body('ids') ids: string[], @CurrentUser() user: IUser) {
    return this.faqService.bulkArchive(ids, user);
  }

  // 26. Bulk Soft Delete
  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'CONTENT_MANAGER')
  bulkDelete(@Body('ids') ids: string[], @CurrentUser() user: IUser) {
    return this.faqService.bulkDelete(ids, user);
  }
}
