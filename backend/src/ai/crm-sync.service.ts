import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ExtractedProfileData {
  fullName?: string;
  mobile?: string;
  email?: string;
  state?: string;
  city?: string;
  preferredCourse?: string;
  preferredCollege?: string;
  budget?: number;
  intent?: string;
}

@Injectable()
export class CRMSyncService {
  private readonly logger = new Logger(CRMSyncService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Automatically Extract Profile Entities from Conversation Text
   */
  extractProfileData(text: string): ExtractedProfileData {
    const data: ExtractedProfileData = {};

    // Mobile Phone regex (10 digits starting with 6-9)
    const phoneMatch = text.match(/\b[6-9]\d{9}\b/);
    if (phoneMatch) data.mobile = phoneMatch[0];

    // Email regex
    const emailMatch = text.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    );
    if (emailMatch) data.email = emailMatch[0];

    // Course Keywords
    const lower = text.toLowerCase();
    if (
      lower.includes('b.tech') ||
      lower.includes('btech') ||
      lower.includes('engineering')
    )
      data.preferredCourse = 'B.Tech';
    else if (lower.includes('mba') || lower.includes('management'))
      data.preferredCourse = 'MBA';
    else if (lower.includes('mbbs') || lower.includes('medical'))
      data.preferredCourse = 'MBBS';
    else if (lower.includes('bca') || lower.includes('mca'))
      data.preferredCourse = 'BCA/MCA';
    else if (lower.includes('llb') || lower.includes('law'))
      data.preferredCourse = 'LLB';

    // State Detection
    const states = [
      'Delhi',
      'Uttar Pradesh',
      'Maharashtra',
      'Karnataka',
      'Haryana',
      'Punjab',
      'Rajasthan',
      'Gujarat',
      'Tamil Nadu',
    ];
    for (const st of states) {
      if (lower.includes(st.toLowerCase())) {
        data.state = st;
        break;
      }
    }

    return data;
  }

  /**
   * Sync AI Chat with Lead, Lead Score, Timeline & Notifications
   */
  async syncChatWithCRM(
    userId: string,
    extracted: ExtractedProfileData,
    userMessage: string,
    replyText: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return null;

      const mobile = extracted.mobile || user.mobile;
      const email = extracted.email || user.email;

      // 1. Find or Create Lead
      let lead = await this.prisma.lead.findFirst({
        where: {
          OR: [{ mobile }, ...(email ? [{ email }] : [])],
          isDeleted: false,
        },
      });

      if (!lead) {
        lead = await this.prisma.lead.create({
          data: {
            fullName: user.fullName || 'Student Lead',
            mobile,
            email,
            state: extracted.state || user.state || 'Delhi',
            city: extracted.city || user.city || 'New Delhi',
            preferredCourse:
              extracted.preferredCourse || 'Engineering/Management',
            source: 'WEBSITE',
            campaign: 'AI_CHATBOT_GEN',
            status: 'NEW',
            priority: 'WARM',
          },
        });

        this.logger.log(
          `Created new Lead '${lead.fullName}' from AI Conversation`,
        );
      } else {
        // Update existing Lead with new preferences if extracted
        lead = await this.prisma.lead.update({
          where: { id: lead.id },
          data: {
            preferredCourse: extracted.preferredCourse || lead.preferredCourse,
            state: extracted.state || lead.state,
            updatedAt: new Date(),
          },
        });
      }

      // 2. Compute AI Lead Score (0 - 100)
      let scoreVal = 65;
      if (extracted.mobile && extracted.preferredCourse) scoreVal += 15;
      if (
        userMessage.toLowerCase().includes('admission') ||
        userMessage.toLowerCase().includes('apply')
      )
        scoreVal += 15;
      if (scoreVal > 100) scoreVal = 100;

      const stage = scoreVal >= 80 ? 'HOT' : scoreVal >= 55 ? 'WARM' : 'COLD';

      await this.prisma.aILeadScore.upsert({
        where: { leadId: lead.id },
        create: {
          leadId: lead.id,
          score: scoreVal,
          qualificationStage: stage,
          intentLevel: scoreVal / 100,
          conversionProbability: scoreVal,
          recommendedNextAction:
            stage === 'HOT'
              ? 'IMMEDIATE_COUNSELOR_CALL'
              : 'SEND_COURSE_BROCHURE',
        },
        update: {
          score: scoreVal,
          qualificationStage: stage,
          intentLevel: scoreVal / 100,
          conversionProbability: scoreVal,
          lastCalculatedAt: new Date(),
        },
      });

      // 3. Log Activity
      await this.prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          action: 'AI_CHAT_INTERACTION',
          details: `AI Chat: Student asked '${userMessage.slice(0, 100)}...'. AI responded with verified guidance. Lead Score: ${scoreVal} (${stage}).`,
        },
      });

      return { lead, scoreVal, stage };
    } catch (err: any) {
      this.logger.error(`Failed to sync chat with CRM: ${err.message}`);
      return null;
    }
  }

  /**
   * Handle Escalation to Human Counselor
   */
  async handleEscalation(
    userId: string,
    conversationId: string,
    reason: string,
    summary: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const activeCounselor = await this.prisma.user.findFirst({
      where: { role: 'COUNSELOR', isApproved: true, isActive: true },
    });

    const counselorId = activeCounselor?.id || undefined;

    // 1. Create Escalation Record
    const escalation = await this.prisma.aIEscalation.create({
      data: {
        conversationId,
        userId,
        counselorId,
        reason: reason || 'LOW_CONFIDENCE',
        status: 'PENDING',
        summary:
          summary ||
          'Student requested immediate assistance or AI confidence was below threshold.',
      },
    });

    // 2. Create Task for Counselor
    if (counselorId) {
      await this.prisma.task.create({
        data: {
          title: `AI Escalation: Follow up with ${user?.fullName || 'Student'}`,
          description: `Reason: ${reason}. Summary: ${summary}`,
          assignedTo: counselorId,
          type: 'CALL_STUDENT',
          status: 'PENDING',
          dueDate: new Date(Date.now() + 3600000), // 1 hour
          priority: 'HIGH',
          relatedTo: conversationId,
        },
      });
    }

    // 3. Create Notifications
    await Promise.all([
      this.prisma.notification.create({
        data: {
          userId,
          type: 'COUNSELOR',
          title: 'Transferred to Counselor',
          message:
            'Your inquiry has been transferred to a senior educational counselor. They will call/chat with you shortly.',
          category: 'AI_ESCALATION',
        },
      }),
      ...(counselorId
        ? [
            this.prisma.notification.create({
              data: {
                userId: counselorId,
                type: 'COUNSELOR',
                title: 'High Priority AI Chat Escalation',
                message: `Student ${user?.fullName || 'User'} (${user?.mobile || 'N/A'}) requested counselor assistance.`,
                category: 'AI_ESCALATION',
              },
            }),
          ]
        : []),
    ]);

    return escalation;
  }
}
