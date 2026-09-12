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
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamQueryDto } from './dto/exam-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface ExportExamItem {
  id: string;
  examName: string;
  slug: string;
  category: string;
  level: string;
  examMode?: string | null;
  conductedBy?: string | null;
  applicationStart?: Date | string | null;
  applicationEnd?: Date | string | null;
  examDate?: Date | string | null;
  resultDate?: Date | string | null;
  applicationFee?: number | null;
  officialWebsite?: string | null;
  featured: boolean;
  status: string;
  createdAt: Date | string;
}

@ApiTags('Exams')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get entrance exam dashboard statistics' })
  getDashboardStats() {
    return this.examsService.getDashboardStats();
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export entrance exams as CSV' })
  async exportCsv(
    @Query() query: ExamQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = (await this.examsService.getExportData(
      query,
    )) as unknown as ExportExamItem[];

    const headers = [
      'ID',
      'Exam Name',
      'Slug',
      'Category',
      'Level',
      'Exam Mode',
      'Conducted By',
      'Application Start',
      'Application End',
      'Exam Date',
      'Result Date',
      'Application Fee',
      'Official Website',
      'Featured',
      'Status',
      'Created At',
    ];

    const rows = data.map((e) =>
      [
        e.id,
        `"${e.examName}"`,
        e.slug,
        e.category,
        e.level,
        e.examMode ?? '',
        `"${e.conductedBy ?? ''}"`,
        e.applicationStart
          ? new Date(e.applicationStart).toLocaleDateString('en-IN')
          : '',
        e.applicationEnd
          ? new Date(e.applicationEnd).toLocaleDateString('en-IN')
          : '',
        e.examDate ? new Date(e.examDate).toLocaleDateString('en-IN') : '',
        e.resultDate ? new Date(e.resultDate).toLocaleDateString('en-IN') : '',
        e.applicationFee ?? '',
        `"${e.officialWebsite ?? ''}"`,
        e.featured,
        e.status,
        new Date(e.createdAt).toLocaleDateString('en-IN'),
      ].join(','),
    );

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exams_${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  // ── List ──────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'List entrance exams with filtering and pagination',
  })
  findAll(@Query() query: ExamQueryDto) {
    return this.examsService.findAll(query);
  }

  // ── Detail ────────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get entrance exam details by ID' })
  findById(@Param('id') id: string) {
    return this.examsService.findById(id);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new entrance exam' })
  create(@Body() dto: CreateExamDto, @Request() req: { user: { id: string } }) {
    return this.examsService.create(dto, req.user.id);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an entrance exam' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.examsService.update(id, dto, req.user.id);
  }

  // ── Soft Delete ───────────────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete (archive) an entrance exam' })
  softDelete(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.examsService.softDelete(id, req.user.id);
  }
}
