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
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { ReplySupportTicketDto } from './dto/reply-support-ticket.dto';
import { QuerySupportTicketDto } from './dto/query-support-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { InternalNoteDto } from './dto/internal-note.dto';
import { BulkSupportActionDto } from './dto/bulk-support-action.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return this.supportService.getDashboard(user);
  }

  @Get('departments')
  getDepartments() {
    return this.supportService.getDepartments();
  }

  @Get('categories')
  getCategories() {
    return this.supportService.getCategories();
  }

  @Get('faqs')
  getFaqs(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.supportService.getFaqs(category, search);
  }

  @Get('kb')
  getKnowledgeBase(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.supportService.getKnowledgeBase(category, search);
  }

  @Get('export')
  async exportTickets(
    @Query('format') format: string = 'json',
    @Query() query: QuerySupportTicketDto,
    @CurrentUser() user: any,
  ) {
    return this.supportService.exportTickets(format, query, user);
  }

  @Get('tickets')
  findAll(@Query() query: QuerySupportTicketDto, @CurrentUser() user: any) {
    return this.supportService.findAll(query, user);
  }

  @Get('tickets/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.supportService.findOne(id, user);
  }

  @Post('tickets')
  createTicket(@Body() dto: CreateSupportTicketDto, @CurrentUser() user: any) {
    return this.supportService.createTicket(dto, user);
  }

  @Post('tickets/bulk')
  bulkAction(@Body() dto: BulkSupportActionDto, @CurrentUser() user: any) {
    return this.supportService.bulkAction(dto, user);
  }

  @Patch('tickets/:id')
  updateTicket(
    @Param('id') id: string,
    @Body() updateData: any,
    @CurrentUser() user: any,
  ) {
    return this.supportService.updateTicket(id, updateData, user?.id || 'User');
  }

  @Delete('tickets/:id')
  deleteTicket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.supportService.deleteTicket(id, user?.id || 'User');
  }

  @Post('tickets/:id/claim')
  claimTicket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.supportService.claimTicket(id, user);
  }

  @Post('tickets/:id/note')
  addInternalNote(
    @Param('id') id: string,
    @Body() dto: InternalNoteDto,
    @CurrentUser() user: any,
  ) {
    return this.supportService.addInternalNote(id, dto, user);
  }

  @Post('tickets/:id/reply')
  replyTicket(
    @Param('id') id: string,
    @Body() dto: ReplySupportTicketDto,
    @CurrentUser() user: any,
  ) {
    return this.supportService.replyTicket(id, dto, user);
  }

  @Post('tickets/:id/resolve')
  resolveTicket(
    @Param('id') id: string,
    @Body() dto: ResolveTicketDto,
    @CurrentUser() user: any,
  ) {
    return this.supportService.resolveTicket(id, dto, user);
  }

  @Post('tickets/:id/assign')
  assignTicket(
    @Param('id') id: string,
    @Body('assignedToId') assignedToId: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.supportService.assignTicket(id, assignedToId, user, reason);
  }

  @Post('tickets/:id/close')
  closeTicket(
    @Param('id') id: string,
    @Body('rating') rating?: number,
    @Body('comment') comment?: string,
    @CurrentUser() user?: any,
  ) {
    return this.supportService.closeTicket(id, user, rating, comment);
  }

  @Post('tickets/:id/reopen')
  reopenTicket(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @CurrentUser() user?: any,
  ) {
    return this.supportService.reopenTicket(id, user, reason);
  }

  @Post('tickets/:id/escalate')
  escalateTicket(
    @Param('id') id: string,
    @Body('reason') reason?: string,
    @CurrentUser() user?: any,
  ) {
    return this.supportService.escalateTicket(id, user, reason);
  }
}
