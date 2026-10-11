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
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogQueryDto } from './dto/blog-query.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // 1. Dashboard Statistics
  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.view', 'blogs.view')
  getStats() {
    return this.blogService.getDashboardStats();
  }

  // 2. Export CSV
  @Get('export')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.export', 'blogs.export')
  async exportCsv(@Query() query: BlogQueryDto, @Res() res: Response) {
    const csv = await this.blogService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="blogs_export.csv"',
    );
    return res.send(csv);
  }

  // 3. Public Articles List
  @Get('public')
  findPublic(@Query() query: BlogQueryDto) {
    return this.blogService.findPublic(query);
  }

  // 3a. Student Personalized Recommendations
  @Get('guides/personalized')
  @UseGuards(OptionalJwtAuthGuard)
  getPersonalizedGuides(@Req() req: any) {
    const userId = req.user?.id || req.query?.userId;
    return this.blogService.getPersonalizedGuides(userId);
  }

  // 3b. Student Saved Guides
  @Get('guides/saved')
  @UseGuards(OptionalJwtAuthGuard)
  getSavedGuides(@Req() req: any) {
    const userId = req.user?.id || req.query?.userId;
    return this.blogService.getSavedGuides(userId);
  }

  // 3c. Student Save Guide
  @Post('guides/:id/save')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  saveGuide(
    @Param('id') guideId: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    const userId = req.user?.id || req.query?.userId || body?.userId;
    if (!userId) {
      throw new UnauthorizedException('Authentication required to save guides');
    }
    return this.blogService.saveGuide(userId, guideId);
  }

  // 3d. Student Unsave Guide
  @Delete('guides/:id/save')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  unsaveGuide(
    @Param('id') guideId: string,
    @Req() req: any,
    @Query() query: any,
  ) {
    const userId = req.user?.id || query?.userId || (req.body as any)?.userId;
    if (!userId) {
      throw new UnauthorizedException('Authentication required to unsave guides');
    }
    return this.blogService.unsaveGuide(userId, guideId);
  }

  // 3e. Counselor Assigned Guidance
  @Get('guides/counselor')
  @UseGuards(OptionalJwtAuthGuard)
  getCounselorGuidance(@Req() req: any) {
    const userId = req.user?.id || req.query?.userId;
    return this.blogService.getCounselorGuidance(userId);
  }

  // 4. Public Article by Slug
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  // 5. Like Article
  @Post('slug/:slug/like')
  @HttpCode(HttpStatus.OK)
  likeBlog(@Param('slug') slug: string) {
    return this.blogService.likeBlog(slug);
  }

  // 6. Share Article
  @Post('slug/:slug/share')
  @HttpCode(HttpStatus.OK)
  shareBlog(@Param('slug') slug: string) {
    return this.blogService.shareBlog(slug);
  }

  // 7. Admin Paginated Query List
  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.view', 'blogs.view')
  findAll(@Query() query: BlogQueryDto) {
    return this.blogService.findAll(query);
  }

  // 7a. Admin Preview Mode
  @Get(':id/preview')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.view', 'blogs.view')
  getPreview(@Param('id') id: string) {
    return this.blogService.getPreview(id);
  }

  // 8. Admin Article by ID
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.view', 'blogs.view')
  findOne(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  // 9. Article Revisions History
  @Get(':id/revisions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.view', 'blogs.view')
  getRevisions(@Param('id') id: string) {
    return this.blogService.getRevisions(id);
  }

  // 10. Rollback Revision
  @Post(':id/rollback/:revisionId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.edit', 'blogs.edit')
  rollbackRevision(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.blogService.rollbackRevision(id, revisionId, userId);
  }

  // 11. Create Blog Article
  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.create', 'blogs.create')
  create(@Body() createBlogDto: CreateBlogDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.blogService.create(createBlogDto, userId);
  }

  // 12. Duplicate Blog Article
  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.create', 'blogs.create')
  duplicate(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.blogService.duplicate(id, userId);
  }

  // 12a. Publish Blog Article
  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.approve', 'blogs.approve')
  @HttpCode(HttpStatus.OK)
  publish(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.blogService.update(id, { status: 'PUBLISHED' }, userId);
  }

  // 12b. Unpublish Blog Article
  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.approve', 'blogs.approve')
  @HttpCode(HttpStatus.OK)
  unpublish(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.blogService.update(id, { status: 'DRAFT' }, userId);
  }

  // 12c. Toggle Featured Status
  @Patch(':id/feature')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.edit', 'blogs.edit')
  @HttpCode(HttpStatus.OK)
  toggleFeatured(
    @Param('id') id: string,
    @Body('featured') featured: boolean,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.blogService.toggleFeatured(id, featured, userId);
  }

  // 13. Update Blog Article
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.edit', 'blogs.edit')
  update(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.blogService.update(id, updateBlogDto, userId);
  }

  // 14. Soft Delete Blog Article
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.delete', 'blogs.delete')
  remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.blogService.remove(id, userId);
  }

  // 15. Restore Soft-Deleted Article
  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('guides.delete', 'blogs.delete', 'guides.edit')
  restore(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.blogService.restore(id, userId);
  }
}
