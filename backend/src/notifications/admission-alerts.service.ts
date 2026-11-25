import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DurableOutboxService } from './durable-outbox.service';
import { SubscribeAlertDto } from './dto/subscribe-alert.dto';

export type PublishAlertContentType =
  | 'BLOG'
  | 'EXAM'
  | 'SCHOLARSHIP'
  | 'STUDY_MATERIAL'
  | 'RANKING';

export interface PublishAlertPayload {
  contentType: PublishAlertContentType;
  contentId: string;
  title: string;
  summary?: string | null;
  category?: string | null;
  urlPath: string;
}

const CONTENT_LABELS: Record<PublishAlertContentType, { badge: string; verb: string }> = {
  BLOG: { badge: 'NEW ARTICLE', verb: 'New Article Published' },
  EXAM: { badge: 'EXAM ALERT', verb: 'Entrance Exam Update Published' },
  SCHOLARSHIP: { badge: 'SCHOLARSHIP ALERT', verb: 'New Scholarship Published' },
  STUDY_MATERIAL: { badge: 'STUDY MATERIAL', verb: 'New Study Material Published' },
  RANKING: { badge: 'OFFICIAL RANKINGS', verb: 'Official College Rankings Published' },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class AdmissionAlertsService {
  private readonly logger = new Logger(AdmissionAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly outbox?: DurableOutboxService,
  ) {}

  private getFrontendBaseUrl(): string {
    const raw =
      process.env.FRONTEND_USER_URL ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173';
    return raw.trim().replace(/\/+$/, '');
  }

  private getBackendBaseUrl(): string {
    const raw =
      process.env.BACKEND_URL ||
      process.env.API_PUBLIC_URL ||
      `http://localhost:${process.env.PORT || 10000}`;
    return raw.trim().replace(/\/+$/, '');
  }

  async subscribe(dto: SubscribeAlertDto) {
    const email = dto.email.trim().toLowerCase();
    const source = (dto.source || 'BLOG_SIDEBAR').trim().slice(0, 64);

    const existing = await this.prisma.alertSubscriber.findUnique({
      where: { email },
    });

    if (existing && existing.status === 'ACTIVE') {
      return {
        success: true,
        alreadySubscribed: true,
        email,
        message: 'You are already subscribed to Swayam Admission alerts.',
      };
    }

    const unsubscribeToken = crypto.randomBytes(24).toString('hex');

    const subscriber = existing
      ? await this.prisma.alertSubscriber.update({
          where: { id: existing.id },
          data: {
            status: 'ACTIVE',
            source,
            unsubscribeToken,
            subscribedAt: new Date(),
            unsubscribedAt: null,
          },
        })
      : await this.prisma.alertSubscriber.create({
          data: {
            email,
            source,
            status: 'ACTIVE',
            unsubscribeToken,
          },
        });

    // Queue confirmation email without blocking the HTTP response on SMTP latency
    void this.enqueueWelcomeEmail(subscriber.email, subscriber.unsubscribeToken);

    return {
      success: true,
      alreadySubscribed: false,
      email: subscriber.email,
      message:
        'Subscribed successfully! You will now receive admission alerts, scholarships, exam dates, and new articles in your inbox.',
    };
  }

  async unsubscribeByToken(token: string) {
    if (!token || !token.trim()) {
      throw new NotFoundException('Invalid unsubscribe token.');
    }

    const subscriber = await this.prisma.alertSubscriber.findUnique({
      where: { unsubscribeToken: token.trim() },
    });

    if (!subscriber) {
      throw new NotFoundException('Subscription not found or link expired.');
    }

    if (subscriber.status !== 'UNSUBSCRIBED') {
      await this.prisma.alertSubscriber.update({
        where: { id: subscriber.id },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      email: subscriber.email,
      message: 'You have been unsubscribed from Swayam Admission alerts.',
    };
  }

  async listSubscribers(page = 1, limit = 50) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [activeCount, unsubscribedCount, total, data] = await Promise.all([
      this.prisma.alertSubscriber.count({ where: { status: 'ACTIVE' } }),
      this.prisma.alertSubscriber.count({ where: { status: 'UNSUBSCRIBED' } }),
      this.prisma.alertSubscriber.count(),
      this.prisma.alertSubscriber.findMany({
        skip,
        take: safeLimit,
        orderBy: { subscribedAt: 'desc' },
        select: {
          id: true,
          email: true,
          source: true,
          status: true,
          subscribedAt: true,
          unsubscribedAt: true,
          lastNotifiedAt: true,
        },
      }),
    ]);

    return {
      stats: {
        total,
        active: activeCount,
        unsubscribed: unsubscribedCount,
      },
      data,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  private async enqueueWelcomeEmail(email: string, unsubscribeToken: string) {
    if (!this.outbox) return;
    try {
      const frontendUrl = this.getFrontendBaseUrl();
      const unsubscribeUrl = `${this.getBackendBaseUrl()}/v1/alerts/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:#F8FAFC; margin:0; padding:24px 12px; color:#1F2937;">
  <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border-radius:14px; overflow:hidden; border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(135deg, #4A7B5B 0%, #2d5e3f 100%); padding:28px 24px; color:#FFFFFF; text-align:center;">
      <div style="font-size:11px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:#F0AE1A; margin-bottom:6px;">Swayam Admission Alerts</div>
      <h1 style="margin:0; font-size:22px; font-weight:800;">Subscription Confirmed</h1>
    </div>
    <div style="padding:26px 24px; font-size:14px; line-height:1.65;">
      <p style="margin-top:0;">Hello,</p>
      <p>Thank you for subscribing to <strong>Swayam Admission Alerts</strong>. Whenever new admission guides, exam schedules, scholarship updates, study materials, or official rankings are published, we will send the update straight to your inbox.</p>
      <div style="margin:22px 0; text-align:center;">
        <a href="${escapeHtml(frontendUrl)}/blogs" style="display:inline-block; background:#4A7B5B; color:#FFFFFF; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:700; font-size:14px;">Explore Admission Guides</a>
      </div>
      <p style="font-size:12px; color:#6B7280; margin-bottom:0;">If you didn't request this, you can <a href="${escapeHtml(unsubscribeUrl)}" style="color:#4A7B5B;">unsubscribe anytime</a>.</p>
    </div>
  </div>
</body>
</html>`;

      await this.outbox.enqueueEmail({
        recipientEmail: email,
        recipientName: 'Subscriber',
        recipientType: 'SUBSCRIBER',
        subject: 'Welcome to Swayam Admission Alerts',
        title: 'Subscription Confirmed',
        message: `Thank you for subscribing to Swayam Admission Alerts. Visit ${frontendUrl}/blogs for the latest updates. Unsubscribe: ${unsubscribeUrl}`,
        html,
        metadata: { type: 'ALERT_SUBSCRIPTION_CONFIRMATION' },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to queue confirmation email for ${email}: ${err?.message}`);
    }
  }

  /**
   * Dispatches email alerts to all active subscribers when new content is published.
   * Safe against duplicate broadcasts for the same content item via AlertBroadcastLog.
   */
  async notifySubscribersOnPublish(payload: PublishAlertPayload): Promise<{ queued: number }> {
    if (!this.outbox) return { queued: 0 };

    const alertKey = `${payload.contentType}:${payload.contentId}`;

    try {
      const alreadySent = await this.prisma.alertBroadcastLog.findUnique({
        where: { alertKey },
      });
      if (alreadySent) {
        return { queued: 0 };
      }

      const subscribers = await this.prisma.alertSubscriber.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, email: true, unsubscribeToken: true },
      });

      if (subscribers.length === 0) {
        return { queued: 0 };
      }

      // Claim broadcast key before queueing to prevent concurrent duplicate sends
      try {
        await this.prisma.alertBroadcastLog.create({
          data: {
            alertKey,
            contentType: payload.contentType,
            contentId: payload.contentId,
            title: payload.title,
            recipientCount: subscribers.length,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          return { queued: 0 };
        }
        throw err;
      }

      const meta = CONTENT_LABELS[payload.contentType];
      const frontendUrl = this.getFrontendBaseUrl();
      const backendUrl = this.getBackendBaseUrl();
      const targetPath = payload.urlPath.startsWith('/')
        ? payload.urlPath
        : `/${payload.urlPath}`;
      const articleUrl = `${frontendUrl}${targetPath}`;
      const cleanSummary =
        (payload.summary || '')
          .replace(/[#*_`>]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 260) ||
        'A new update has just been published on Swayam Admission. Click below to read full details.';

      const subject = `${meta.verb}: ${payload.title}`;
      let queued = 0;

      for (const sub of subscribers) {
        const unsubscribeUrl = `${backendUrl}/v1/alerts/unsubscribe?token=${encodeURIComponent(sub.unsubscribeToken)}`;
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background:#F8FAFC; margin:0; padding:24px 12px; color:#1F2937;">
  <div style="max-width:580px; margin:0 auto; background:#FFFFFF; border-radius:14px; overflow:hidden; border:1px solid #E5E7EB;">
    <div style="background:linear-gradient(135deg, #4A7B5B 0%, #2d5e3f 100%); padding:26px 24px; color:#FFFFFF;">
      <span style="display:inline-block; background:#F0AE1A; color:#FFFFFF; font-size:10px; font-weight:800; letter-spacing:1px; padding:4px 10px; border-radius:999px; margin-bottom:10px;">${escapeHtml(meta.badge)}</span>
      <h1 style="margin:0; font-size:20px; font-weight:800; line-height:1.35;">${escapeHtml(payload.title)}</h1>
      ${payload.category ? `<p style="margin:6px 0 0; font-size:12px; color:rgba(255,255,255,0.85);">Category: ${escapeHtml(payload.category)}</p>` : ''}
    </div>
    <div style="padding:24px; font-size:14px; line-height:1.65;">
      <p style="margin-top:0; color:#374151;">${escapeHtml(cleanSummary)}</p>
      <div style="margin:22px 0;">
        <a href="${escapeHtml(articleUrl)}" style="display:inline-block; background:#4A7B5B; color:#FFFFFF; text-decoration:none; padding:12px 22px; border-radius:10px; font-weight:700; font-size:14px;">Read Full Details</a>
      </div>
      <hr style="border:none; border-top:1px solid #E5E7EB; margin:22px 0;" />
      <p style="font-size:12px; color:#6B7280; margin:0;">
        You are receiving this email because you subscribed to Swayam Admission Alerts.
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#4A7B5B;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;

        await this.outbox.enqueueEmail({
          recipientEmail: sub.email,
          recipientName: 'Subscriber',
          recipientType: 'SUBSCRIBER',
          subject,
          title: payload.title,
          message: `${meta.verb}: ${payload.title}\n\n${cleanSummary}\n\nRead more: ${articleUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
          html,
          metadata: {
            alertKey,
            contentType: payload.contentType,
            contentId: payload.contentId,
            subscriberId: sub.id,
          },
        });
        queued++;
      }

      await this.prisma.alertSubscriber.updateMany({
        where: { id: { in: subscribers.map((s) => s.id) } },
        data: { lastNotifiedAt: new Date() },
      });

      this.logger.log(
        `[ADMISSION ALERT BROADCAST] ${alertKey} queued ${queued} subscriber email(s).`,
      );

      return { queued };
    } catch (err: any) {
      this.logger.error(
        `Failed to broadcast alert for ${alertKey}: ${err?.message}`,
      );
      return { queued: 0 };
    }
  }
}
