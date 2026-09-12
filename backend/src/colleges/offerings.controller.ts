import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OfferingsService } from './offerings.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';
import { OfferingStatus } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('College Offerings')
@Controller('colleges/offerings')
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Public discoverable offerings for students' })
  getPublicOfferings(
    @Query('collegeId') collegeId?: string,
    @Query('courseId') courseId?: string,
    @Query('branchId') branchId?: string,
    @Query('academicSession') academicSession?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.offeringsService.getOfferings({
      collegeId,
      courseId,
      branchId,
      academicSession,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      publicOnly: true,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.offering.view', 'college.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get college offerings with tenant isolation' })
  getOfferings(
    @Query('collegeId') collegeId?: string,
    @Query('courseId') courseId?: string,
    @Query('branchId') branchId?: string,
    @Query('academicSession') academicSession?: string,
    @Query('status') status?: OfferingStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: IUser,
  ) {
    return this.offeringsService.getOfferings(
      {
        collegeId,
        courseId,
        branchId,
        academicSession,
        status,
        search,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      user?.id,
    );
  }

  @Get('matrix/:collegeId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.offering.view', 'college.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get seat matrix accounting for a college' })
  getSeatMatrix(
    @Param('collegeId') collegeId: string,
    @Query('academicSession') academicSession?: string,
    @CurrentUser() user?: IUser,
  ) {
    return this.offeringsService.getSeatMatrix(
      collegeId,
      academicSession,
      user?.id,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.offering.view', 'college.view')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single college offering by ID' })
  getOfferingById(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.offeringsService.getOfferingById(id, user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.offering.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new college academic offering' })
  createOffering(
    @Body() dto: CreateOfferingDto,
    @CurrentUser() user: IUser,
  ) {
    return this.offeringsService.createOffering(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.offering.edit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update college offering fees, seats, or details' })
  updateOffering(
    @Param('id') id: string,
    @Body() dto: UpdateOfferingDto,
    @CurrentUser() user: IUser,
  ) {
    return this.offeringsService.updateOffering(id, dto, user.id);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.offering.submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit offering for admin verification and approval' })
  submitOffering(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.offeringsService.submitOfferingForApproval(id, user.id);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.offering.approve')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin approves offering making it active' })
  approveOffering(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.offeringsService.approveOffering(id, user.id);
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.offering.close')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Close offering intake for current session' })
  closeOffering(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.offeringsService.closeOffering(id, user.id);
  }
}
