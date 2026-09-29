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
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { FeedbackDto } from './dto/feedback.dto';
import { EscalateDto } from './dto/escalate.dto';
import { UpdateAISettingsDto } from './dto/settings.dto';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  /**
   * Public Configuration for Frontends
   * Returns feature toggle, dynamic welcome message, suggested chips, counselor desk info & disclaimer
   */
  @Get('config')
  getConfig() {
    return this.aiService.getPublicConfig();
  }

  /**
   * Public & Authenticated Chat Endpoint
   * Supports both guest users and authenticated students
   */
  @Post('chat')
  @UseGuards(OptionalJwtAuthGuard)
  chat(@CurrentUser() user: IUser | null, @Body() dto: ChatDto) {
    return this.aiService.chat(user?.id, dto);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getStats() {
    return this.aiService.getStats();
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.aiService.getLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getConversations(@CurrentUser() user: IUser) {
    return this.aiService.getConversations(
      user.role === 'STUDENT' ? user.id : undefined,
    );
  }

  @Get('conversation/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getConversationById(@CurrentUser() user: IUser, @Param('id') id: string) {
    return this.aiService.getConversationById(id, user.id);
  }

  @Delete('conversations/:id')
  @UseGuards(OptionalJwtAuthGuard)
  deleteConversation(
    @CurrentUser() user: IUser | null,
    @Param('id') id: string,
  ) {
    return this.aiService.deleteConversation(id, user?.id);
  }

  @Get('counselor-status')
  @UseGuards(OptionalJwtAuthGuard)
  getCounselorStatus(@CurrentUser() user: IUser | null) {
    return this.aiService.getCounselorStatus(user?.id);
  }

  @Post('feedback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  submitFeedback(@CurrentUser() user: IUser, @Body() dto: FeedbackDto) {
    return this.aiService.submitFeedback(user.id, dto);
  }

  @Post('escalate')
  @UseGuards(OptionalJwtAuthGuard)
  escalate(@CurrentUser() user: IUser | null, @Body() dto: EscalateDto) {
    return this.aiService.escalate(user?.id || 'guest_user', dto);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  uploadDocument(
    @Body('title') title: string,
    @Body('category') category: string,
    @Body('fileType') fileType: string,
    @Body('content') content: string,
  ) {
    return this.aiService.uploadKnowledgeDocument(
      title || 'Knowledge Base Document',
      category || 'GENERAL',
      fileType || 'PDF',
      content || 'Sample admission guidelines and FAQ context.',
    );
  }

  @Post('train/knowledge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  trainKnowledge() {
    return this.aiService.syncDatabase();
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  reindex() {
    return this.aiService.syncDatabase();
  }

  @Post('sync-database')
  @UseGuards(JwtAuthGuard, RolesGuard)
  syncDatabase() {
    return this.aiService.syncDatabase();
  }

  @Get('models')
  getModels() {
    return this.aiService.getModels();
  }

  @Get('provider-status')
  getProviderStatus() {
    return {
      activeProvider: 'Gemini',
      status: 'HEALTHY',
      providers: [
        { name: 'Gemini', status: 'ONLINE', latencyMs: 350 },
        { name: 'OpenAI', status: 'ONLINE', latencyMs: 420 },
        { name: 'Claude', status: 'READY', latencyMs: 480 },
        { name: 'DeepSeek', status: 'READY', latencyMs: 510 },
      ],
    };
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getSettings() {
    return this.aiService.getSettings();
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateSettings(@Body() dto: UpdateAISettingsDto) {
    return this.aiService.updateSettings(dto);
  }

  @Get('cost')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getCost() {
    return this.aiService.getStats();
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getAnalytics() {
    return this.aiService.getStats();
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getRecommendations(@CurrentUser() user: IUser) {
    return this.aiService.getRecommendations(user.id);
  }

  @Get('knowledge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  getKnowledge() {
    return this.aiService.getKnowledge();
  }

  @Delete('knowledge/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  deleteKnowledge(@Param('id') id: string) {
    return this.aiService.deleteKnowledge(id);
  }
}
