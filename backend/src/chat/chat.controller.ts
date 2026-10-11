import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';
import { SendMessageDto } from './dto/send-message.dto';
import { GetConversationQueryDto } from './dto/get-conversation.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('assigned-counselor')
  getAssignedCounselor(
    @CurrentUser() user: IUser,
    @Query('applicationId') applicationId?: string,
  ) {
    return this.chatService.getAssignedCounselor(user.id, applicationId);
  }

  @Get('conversation')
  getOrCreateConversation(
    @CurrentUser() user: IUser,
    @Query() query: GetConversationQueryDto,
  ) {
    return this.chatService.getOrCreateConversation(user, query);
  }

  @Get('conversations')
  listConversations(@CurrentUser() user: IUser) {
    return this.chatService.listUserConversations(user);
  }

  @Get('conversations/:id/messages')
  getConversationMessages(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
  ) {
    return this.chatService.getConversationMessages(user, id);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(user, id, dto);
  }

  @Patch('conversations/:id/read')
  markRead(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
  ) {
    return this.chatService.markAsRead(user, id);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: IUser) {
    return this.chatService.getUnreadCount(user);
  }
}
