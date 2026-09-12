import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CourseQueryDto,
  CreateBranchDto,
  UpdateBranchDto,
  BranchQueryDto,
} from './course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get course dashboard statistics' })
  getDashboardStats() {
    return this.coursesService.getDashboardStats();
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export courses as CSV' })
  async exportCsv(
    @Query() query: CourseQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const filters = parseQueryFilters(query);
    const data = await this.coursesService.getExportData(filters);

    const headers = [
      'ID',
      'Name',
      'College',
      'Category',
      'Level',
      'Mode',
      'Duration',
      'Seats',
      'Total Fee',
      'Semester Fee',
      'Eligibility',
      'Entrance Exam',
      'Average Salary',
      'Status',
      'Featured',
      'Created At',
    ];

    const rows = data.map((c) => {
      const college = c.college as { name?: string } | null;
      return [
        c.id,
        `"${c.name}"`,
        `"${college?.name ?? ''}"`,
        c.category,
        c.level,
        c.mode,
        `${c.duration} ${c.durationType}`,
        c.seats ?? '',
        c.totalFees ?? '',
        c.semesterFees ?? '',
        `"${c.eligibility ?? ''}"`,
        `"${c.entranceExam ?? ''}"`,
        c.averageSalary ?? '',
        c.status,
        c.featured,
        new Date(c.createdAt).toLocaleDateString('en-IN'),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="courses_${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  // ── List ──────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all courses with filters and pagination' })
  findAll(@Query() query: CourseQueryDto) {
    return this.coursesService.findAll(parseQueryFilters(query));
  }

  // ── Streams by Education Level ────────────────────────────────────────────
  @Get('streams')
  @ApiOperation({ summary: 'Get stream disciplines by education level' })
  getStreams(@Query('educationLevel') educationLevel?: string) {
    return this.coursesService.getStreamsByEducationLevel(educationLevel);
  }

  // ── Detail ────────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get course by ID' })
  findById(@Param('id') id: string) {
    return this.coursesService.findById(id);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course' })
  create(
    @Body() dto: CreateCourseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.coursesService.create(dto, req.user.id);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.coursesService.update(id, dto, req.user.id);
  }

  // ── Soft Delete ───────────────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a course' })
  softDelete(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.coursesService.softDelete(id, req.user.id);
  }

  // ── Public: Get Branches for Course ───────────────────────────────────────
  @Get(':courseId/branches')
  @ApiOperation({ summary: 'Get active branches for a course' })
  getBranches(
    @Param('courseId') courseId: string,
    @Query() query: BranchQueryDto,
  ) {
    return this.coursesService.getBranchesForCourse(courseId, query.status);
  }

  // ── Admin: Create Branch ──────────────────────────────────────────────────
  @Post(':courseId/branches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new branch for a course' })
  createBranch(
    @Param('courseId') courseId: string,
    @Body() dto: CreateBranchDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.coursesService.createBranch(courseId, dto, req.user.id);
  }

  // ── Admin: Update Branch ──────────────────────────────────────────────────
  @Patch(':courseId/branches/:branchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a branch for a course' })
  updateBranch(
    @Param('courseId') courseId: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBranchDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.coursesService.updateBranch(courseId, branchId, dto, req.user.id);
  }

  // ── Admin: Delete Branch ──────────────────────────────────────────────────
  @Delete(':courseId/branches/:branchId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a branch if no leads/applications reference it' })
  deleteBranch(
    @Param('courseId') courseId: string,
    @Param('branchId') branchId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.coursesService.deleteBranch(courseId, branchId, req.user.id);
  }
}

// ─── Pure helper (no class needed) ──────────────────────────────────────────
function parseQueryFilters(query: CourseQueryDto) {
  return {
    q: query.q,
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    category: query.category,
    level: query.level,
    mode: query.mode,
    collegeId: query.collegeId,
    state: query.state,
    status: query.status,
    featured:
      query.featured === 'true'
        ? true
        : query.featured === 'false'
          ? false
          : undefined,
    educationLevel: query.educationLevel,
    stream: query.stream,
    entryType: query.entryType,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
}
