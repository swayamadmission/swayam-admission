import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Ip,
  UseGuards,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactEntryDto } from './dto/create-contact-entry.dto';
import { UpdateContactEntryDto } from './dto/update-contact-entry.dto';
import { CreateDepartmentContactDto } from './dto/create-department-contact.dto';
import { UpdateDepartmentContactDto } from './dto/update-department-contact.dto';
import { CreateContactEnquiryDto } from './dto/create-contact-enquiry.dto';
import { UpdateEnquiryStatusDto } from './dto/update-enquiry-status.dto';
import { UpdateContactSettingsDto } from './dto/update-contact-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // ─── PUBLIC ENDPOINTS ──────────────────────────────────────────────────────

  /**
   * Public Contact Us page aggregated data (departments, office hours, verified socials, categories)
   */
  @Get('public')
  getPublicContactData() {
    return this.contactService.getPublicContactData();
  }

  /**
   * Submit public enquiry form with validation, spam protection, and unique ref ID
   */
  @Post('enquire')
  submitPublicEnquiry(
    @Body() dto: CreateContactEnquiryDto,
    @Ip() ip: string,
    @Req() req: any,
  ) {
    const clientIp =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      ip ||
      '127.0.0.1';
    return this.contactService.submitPublicEnquiry(dto, clientIp);
  }

  // ─── ADMIN DEPARTMENT CONTACTS CRUD ────────────────────────────────────────

  @Get('admin/departments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR', 'DIRECTOR', 'SUPPORT')
  getAdminDepartmentContacts(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.contactService.getAdminDepartmentContacts({ search, isActive });
  }

  @Post('admin/departments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createDepartmentContact(
    @Body() dto: CreateDepartmentContactDto,
    @CurrentUser() user: any,
  ) {
    return this.contactService.createDepartmentContact(dto, user);
  }

  @Patch('admin/departments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateDepartmentContact(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentContactDto,
    @CurrentUser() user: any,
  ) {
    return this.contactService.updateDepartmentContact(id, dto, user);
  }

  @Delete('admin/departments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteDepartmentContact(@Param('id') id: string, @CurrentUser() user: any) {
    return this.contactService.deleteDepartmentContact(id, user);
  }

  @Post('admin/departments/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  reorderDepartmentContacts(
    @Body('ids') ids: string[],
    @CurrentUser() user: any,
  ) {
    return this.contactService.reorderDepartmentContacts(ids, user);
  }

  // ─── ADMIN DIRECTORY CRUD (BACKWARD COMPATIBILITY) ──────────────────────────

  @Get('admin/directory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR', 'DIRECTOR', 'SUPPORT')
  getAdminDirectory(
    @Query('department') department?: string,
    @Query('contactType') contactType?: string,
    @Query('search') search?: string,
  ) {
    return this.contactService.getAllDirectoryEntries({
      department,
      contactType,
      search,
    });
  }

  @Post('admin/directory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createDirectoryEntry(@Body() dto: CreateContactEntryDto) {
    return this.contactService.createDirectoryEntry(dto);
  }

  @Patch('admin/directory/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateDirectoryEntry(
    @Param('id') id: string,
    @Body() dto: UpdateContactEntryDto,
  ) {
    return this.contactService.updateDirectoryEntry(id, dto);
  }

  @Delete('admin/directory/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteDirectoryEntry(@Param('id') id: string) {
    return this.contactService.deleteDirectoryEntry(id);
  }

  @Post('admin/directory/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  reorderDirectoryEntries(@Body('ids') ids: string[]) {
    return this.contactService.reorderDirectoryEntries(ids);
  }

  // ─── ADMIN ENQUIRIES INBOX & ASSIGNMENT ─────────────────────────────────────

  @Get('admin/enquiries')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR', 'DIRECTOR', 'SUPPORT')
  getEnquiries(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.contactService.getEnquiries({
      page,
      limit,
      status,
      category,
      search,
      startDate,
      endDate,
    });
  }

  @Get('admin/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR', 'DIRECTOR', 'SUPPORT')
  getAssignableStaff() {
    return this.contactService.getAssignableStaff();
  }

  @Get('admin/enquiries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR', 'DIRECTOR', 'SUPPORT')
  getEnquiryById(@Param('id') id: string) {
    return this.contactService.getEnquiryById(id);
  }

  @Patch('admin/enquiries/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR', 'DIRECTOR', 'SUPPORT')
  updateEnquiryStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.contactService.updateEnquiryStatus(id, dto, user);
  }

  @Delete('admin/enquiries/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteEnquiry(@Param('id') id: string, @CurrentUser() user: any) {
    return this.contactService.deleteEnquiry(id, user);
  }

  // ─── ADMIN CONTACT SETTINGS & BUSINESS HOURS ───────────────────────────────

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR', 'DIRECTOR', 'SUPPORT')
  getContactSettings() {
    return this.contactService.getContactSettings();
  }

  @Patch('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateContactSettings(
    @Body() dto: UpdateContactSettingsDto,
    @CurrentUser() user: any,
  ) {
    return this.contactService.updateContactSettings(dto, user);
  }
}
