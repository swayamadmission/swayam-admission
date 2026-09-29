import { Injectable, Logger } from '@nestjs/common';
import { LiveSyncGateway } from './live-sync.gateway';

export type BusinessEventType =
  | 'student.created'
  | 'student.updated'
  | 'student.approved'
  | 'counselor.created'
  | 'counselor.updated'
  | 'counselor.assignment.updated'
  | 'application.created'
  | 'application.submitted'
  | 'application.review.updated'
  | 'application.approved'
  | 'application.rejected'
  | 'lead.created'
  | 'lead.updated'
  | 'payment.completed'
  | 'payment.failed'
  | 'document.uploaded'
  | 'document.verified'
  | 'referral.created'
  | 'referral.reward.updated'
  | 'coupon.created'
  | 'coupon.updated'
  | 'support.ticket.created'
  | 'guide.created'
  | 'guide.updated'
  | 'guide.published'
  | 'guide.unpublished'
  | 'guide.deleted'
  | 'material.created'
  | 'material.updated'
  | 'material.published'
  | 'material.unpublished'
  | 'material.deleted'
  | 'material.purchased'
  | 'notification.created'
  | 'notification.read'
  | 'notification.readAll';

@Injectable()
export class LiveSyncService {
  private readonly logger = new Logger(LiveSyncService.name);

  constructor(private readonly gateway: LiveSyncGateway) {}

  /**
   * Publish a high-level business event to Admin and relevant parties
   */
  publishEvent(event: BusinessEventType, payload: any, targetUserId?: string) {
    try {
      this.logger.log(`Broadcasting business event: ${event} ${targetUserId ? `(Target: ${targetUserId})` : ''}`);
      this.gateway.emitAdminEvent(event, payload);

      if (targetUserId) {
        this.gateway.emitUserEvent(targetUserId, event, payload);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to broadcast live sync event ${event}: ${err?.message}`);
    }
  }
}
