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
import { ScholarshipsService } from './scholarships.service';
import { CreateScholarshipDto } from './dto/create-scholarship.dto';
import { UpdateScholarshipDto } from './dto/update-scholarship.dto';
import { ScholarshipQueryDto } from './dto/scholarship-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface ExportScholarshipItem {
  id: string;
  scholarshipName: string;
  slug: string;
  provider?: string | null;
  scholarshipType?: string | null;
  category?: string | null;
  gender?: string | null;
  state?: string | null;
  amount?: number | null;
  incomeLimit?: number | null;
  applicationStart?: Date | string | null;
  applicationEnd?: Date | string | null;
  officialWebsite?: string | null;
  featured: boolean;
  status: string;
  createdAt: Date | string;
}

@ApiTags('Scholarships')
@Controller('scholarships')
export class ScholarshipsController {
  constructor(private readonly scholarshipsService: ScholarshipsService) {}

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scholarship dashboard statistics' })
  getDashboardStats() {
    return this.scholarshipsService.getDashboardStats();
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  @Get('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export scholarships as CSV' })
  async exportCsv(
    @Query() query: ScholarshipQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const data = (await this.scholarshipsService.getExportData(
      query,
    )) as unknown as ExportScholarshipItem[];

    const headers = [
      'ID',
      'Scholarship Name',
      'Slug',
      'Provider',
      'Type',
      'Category',
      'Gender',
      'State',
      'Amount (INR)',
      'Income Limit (INR)',
      'Application Start',
      'Application End',
      'Official Website',
      'Featured',
      'Status',
      'Created At',
    ];

    const rows = data.map((s) =>
      [
        s.id,
        `"${s.scholarshipName}"`,
        s.slug,
        `"${s.provider ?? ''}"`,
        s.scholarshipType ?? '',
        s.category ?? '',
        s.gender ?? '',
        s.state ?? '',
        s.amount ?? '',
        s.incomeLimit ?? '',
        s.applicationStart
          ? new Date(s.applicationStart).toLocaleDateString('en-IN')
          : '',
        s.applicationEnd
          ? new Date(s.applicationEnd).toLocaleDateString('en-IN')
          : '',
        `"${s.officialWebsite ?? ''}"`,
        s.featured,
        s.status,
        new Date(s.createdAt).toLocaleDateString('en-IN'),
      ].join(','),
    );

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="scholarships_${Date.now()}.csv"`,
    );
    res.send(csv);
  }

  // ── List ──────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List scholarships with filtering and pagination' })
  findAll(@Query() query: ScholarshipQueryDto) {
    return this.scholarshipsService.findAll(query);
  }

  // ── Detail ────────────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get scholarship details by ID' })
  findById(@Param('id') id: string) {
    return this.scholarshipsService.findById(id);
  }

  // ── Create ────────────────────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new scholarship' })
  create(
    @Body() dto: CreateScholarshipDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.scholarshipsService.create(dto, req.user.id);
  }

  // ── Update ────────────────────────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a scholarship' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScholarshipDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.scholarshipsService.update(id, dto, req.user.id);
  }

  // ── Soft Delete ───────────────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete (archive) a scholarship' })
  softDelete(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.scholarshipsService.softDelete(id, req.user.id);
  }
}
