import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'events',
})
@Injectable()
export class LiveSyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveSyncGateway.name);
  private connectedSockets = new Map<string, { userId?: string; role?: string }>();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    const role = client.handshake.query.role as string;
    this.connectedSockets.set(client.id, { userId, role });

    // Join admin room if admin or super admin
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      client.join('admin_events');
    }

    if (userId) {
      client.join(`user_${userId}`);
      if (role === 'COUNSELOR') {
        client.join(`counselor_${userId}`);
      }
    }

    this.logger.log(`LiveSync client connected: ${client.id} (User: ${userId || 'anonymous'}, Role: ${role || 'guest'})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedSockets.delete(client.id);
    this.logger.log(`LiveSync client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_admin')
  handleSubscribeAdmin(@ConnectedSocket() client: Socket) {
    client.join('admin_events');
    return { event: 'subscribed', room: 'admin_events' };
  }

  @SubscribeMessage('subscribe_counselor')
  handleSubscribeCounselor(@ConnectedSocket() client: Socket, @MessageBody() data: { counselorId: string }) {
    if (data?.counselorId) {
      client.join(`counselor_${data.counselorId}`);
      return { event: 'subscribed', room: `counselor_${data.counselorId}` };
    }
  }

  /**
   * Broadcast an authorized event to the admin room
   */
  emitAdminEvent(event: string, payload: any) {
    if (this.server) {
      this.server.to('admin_events').emit(event, {
        event,
        payload,
        timestamp: new Date().toISOString(),
      });
      // Also broadcast globally to connected admin clients
      this.server.emit(event, {
        event,
        payload,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Send a targeted event to a specific user/counselor room
   */
  emitUserEvent(userId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(`user_${userId}`).emit(event, {
        event,
        payload,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
