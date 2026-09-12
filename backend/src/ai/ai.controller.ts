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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  chat(@CurrentUser() user: IUser, @Body() dto: ChatDto) {
    return this.aiService.chat(user.id, dto);
  }

  @Get('stats')
  getStats() {
    return this.aiService.getStats();
  }

  @Get('logs')
  getLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.aiService.getLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('conversations')
  getConversations(@CurrentUser() user: IUser) {
    return this.aiService.getConversations(
      user.role === 'STUDENT' ? user.id : undefined,
    );
  }

  @Get('conversation/:id')
  getConversationById(@Param('id') id: string) {
    return this.aiService.getConversationById(id);
  }

  @Post('feedback')
  submitFeedback(@CurrentUser() user: IUser, @Body() dto: FeedbackDto) {
    return this.aiService.submitFeedback(user.id, dto);
  }

  @Post('escalate')
  escalate(@CurrentUser() user: IUser, @Body() dto: EscalateDto) {
    return this.aiService.escalate(user.id, dto);
  }

  @Post('upload')
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
  trainKnowledge() {
    return this.aiService.reindexKnowledge();
  }

  @Post('reindex')
  reindex() {
    return this.aiService.reindexKnowledge();
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
  getSettings() {
    return this.aiService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateAISettingsDto) {
    return this.aiService.updateSettings(dto);
  }

  @Get('cost')
  getCost() {
    return this.aiService.getStats();
  }

  @Get('analytics')
  getAnalytics() {
    return this.aiService.getStats();
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser() user: IUser) {
    return this.aiService.getRecommendations(user.id);
  }

  @Get('knowledge')
  getKnowledge() {
    return this.aiService.getKnowledge();
  }

  @Delete('knowledge/:id')
  deleteKnowledge(@Param('id') id: string) {
    return this.aiService.deleteKnowledge(id);
  }
}
