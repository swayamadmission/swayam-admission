import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { SupportService } from './support.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'support',
})
@Injectable()
export class SupportGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportGateway.name);
  private onlineUsers = new Map<string, string>(); // socketId -> userId

  constructor(private readonly supportService: SupportService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.onlineUsers.set(client.id, userId);
      this.logger.log(
        `Support WebSocket client connected: ${client.id} (User: ${userId})`,
      );
      this.server.emit('user_online', { userId, isOnline: true });
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.onlineUsers.get(client.id);
    if (userId) {
      this.onlineUsers.delete(client.id);
      this.logger.log(`Support WebSocket client disconnected: ${client.id}`);
      this.server.emit('user_online', { userId, isOnline: false });
    }
  }

  @SubscribeMessage('join_ticket')
  handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; userId: string },
  ) {
    const room = `ticket_${data.ticketId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined support room ${room}`);
    return { event: 'joined_room', room };
  }

  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    const room = `ticket_${data.ticketId}`;
    client.leave(room);
    return { event: 'left_room', room };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      ticketId: string;
      senderId: string;
      message: string;
      isInternal?: boolean;
      attachmentUrl?: string;
    },
  ) {
    try {
      const isStaff = data.isInternal || false;
      const msg = await this.supportService.replyTicket(
        data.ticketId,
        {
          message: data.message,
          isInternal: data.isInternal,
          attachmentUrl: data.attachmentUrl,
        },
        data.senderId,
        isStaff,
      );

      const room = `ticket_${data.ticketId}`;
      this.server.to(room).emit('new_message', msg);
      return { status: 'success', data: msg };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; userId: string; userName: string },
  ) {
    const room = `ticket_${data.ticketId}`;
    client.to(room).emit('user_typing', data);
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string; userId: string },
  ) {
    const room = `ticket_${data.ticketId}`;
    client.to(room).emit('user_stop_typing', data);
  }
}
