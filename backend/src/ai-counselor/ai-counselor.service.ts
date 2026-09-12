import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyzeDto } from './dto/analyze.dto';
import { SaveRecommendationDto } from './dto/save-recommendation.dto';
import { AiMemoryService } from '../ai-memory/ai-memory.service';
import { AiRecommendationService } from '../ai-recommendation/ai-recommendation.service';
import { AiPromptsService } from '../ai-prompts/ai-prompts.service';
import { AiAnalyticsService } from '../ai-analytics/ai-analytics.service';
import { AIMessageRole } from '@prisma/client';
import type { ILLMProvider } from '../ai-chat/interfaces/llm-provider.interface';

@Injectable()
export class AiCounselorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiMemory: AiMemoryService,
    private readonly aiRecommendation: AiRecommendationService,
    private readonly aiPrompts: AiPromptsService,
    private readonly aiAnalytics: AiAnalyticsService,
    @Inject('ILLMProvider') private readonly llmProvider: ILLMProvider,
  ) {}

  /**
   * Main analysis endpoint — orchestrates AI engines.
   */
  async analyze(userId: string, dto: AnalyzeDto) {
    // 1. Get or create student preferences (only updating provided fields)
    const existingPref = await this.prisma.studentPreference.findUnique({
      where: { userId },
    });

    await this.prisma.studentPreference.upsert({
      where: { userId },
      create: {
        userId,
        stream: dto.stream || 'OTHER',
        tenthMarks: dto.tenthMarks || 0,
        twelfthMarks: dto.twelfthMarks || 0,
        budgetMin: dto.budgetMin || 0,
        budgetMax: dto.budgetMax || 0,
        interests: dto.interests || [],
        preferredStates: dto.preferredStates || [],
        preferredCities: dto.preferredCities || [],
        collegeType: dto.collegeType || 'ANY',
        careerGoal: dto.careerGoal || '',
      },
      update: {
        stream: dto.stream ?? existingPref?.stream,
        tenthMarks: dto.tenthMarks ?? existingPref?.tenthMarks,
        twelfthMarks: dto.twelfthMarks ?? existingPref?.twelfthMarks,
        budgetMin: dto.budgetMin ?? existingPref?.budgetMin,
        budgetMax: dto.budgetMax ?? existingPref?.budgetMax,
        interests: dto.interests ?? existingPref?.interests,
        preferredStates: dto.preferredStates ?? existingPref?.preferredStates,
        preferredCities: dto.preferredCities ?? existingPref?.preferredCities,
        collegeType: dto.collegeType ?? existingPref?.collegeType,
        careerGoal: dto.careerGoal ?? existingPref?.careerGoal,
      },
    });

    // 2. Initialize memory/conversation context
    const { id: conversationId } = await this.aiMemory.createConversation(
      userId,
      `${dto.stream} Counseling Session`,
    );

    // 3. Save User message
    await this.aiMemory.addMessage(
      conversationId,
      AIMessageRole.USER,
      JSON.stringify(dto),
    );

    // 4. Fetch System prompt & Live Payment Context
    const systemPromptText = await this.aiPrompts.getPrompt(
      'SYSTEM_COUNSELOR',
      {
        studentName: 'Student', // Ideally fetched from user profile
        language: 'English',
      },
    );

    const paymentContext = await this.getPaymentContext(userId);
    const systemPrompt = `${systemPromptText}\n\n[LIVE STUDENT FINANCIAL & PAYMENT CONTEXT]\n${JSON.stringify(paymentContext, null, 2)}`;

    // 5. Generate Recommendations using AI Engine
    const recommendations =
      await this.aiRecommendation.recommendColleges(userId);

    // 6. Formulate AI Response using LLM Provider
    const summary = await this.llmProvider.generateResponse(
      dto.message || 'Please recommend colleges based on my profile.',
      {
        colleges: recommendations,
        systemPrompt,
        paymentContext,
      },
    );

    const aiResponsePayload = {
      reply: summary,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      colleges: recommendations.map((r: any) => ({
        id: r.college.id,
        name: r.college.name,
        location: r.college.city,
        fees: r.college.applicationFee ? `₹${r.college.applicationFee}` : 'N/A',
        rating: 4.5, // placeholder
        match: r.score,
      })),
      chips: ['Get More Options', 'Talk to Counselor'],
    };

    // 7. Save Assistant message
    await this.aiMemory.addMessage(
      conversationId,
      AIMessageRole.ASSISTANT,
      JSON.stringify(aiResponsePayload),
    );

    // 8. Track Analytics
    await this.aiAnalytics.trackSession({
      userId,
      conversationId,
      queryCategory: 'COLLEGE_RECOMMENDATION',
    });

    return {
      conversationId,
      ...aiResponsePayload,
      systemPromptUsed: systemPrompt,
    };
  }

  /**
   * Get user's conversation history
   */
  async getHistory(userId: string) {
    return this.aiMemory.getUserConversations(userId);
  }

  /**
   * Get user's saved recommendations
   */
  async getRecommendations(userId: string) {
    return this.prisma.savedRecommendation.findMany({
      where: { userId },
      include: {
        college: true,
        course: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Save a recommendation
   */
  async saveRecommendation(userId: string, dto: SaveRecommendationDto) {
    return this.aiRecommendation.saveRecommendation(
      userId,
      dto.collegeId,
      dto.courseId,
      dto.score,
      dto.reasoning,
    );
  }

  /**
   * Delete a saved recommendation
   */
  async deleteRecommendation(userId: string, id: string) {
    const recommendation = await this.prisma.savedRecommendation.findUnique({
      where: { id },
    });

    if (!recommendation) {
      throw new NotFoundException('Saved recommendation not found');
    }

    if (recommendation.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own saved recommendations',
      );
    }

    await this.prisma.savedRecommendation.delete({
      where: { id },
    });

    return { message: 'Recommendation removed' };
  }

  /**
   * Fetch live payment and financial context from PostgreSQL for AI Counselor prompt injection.
   */
  async getPaymentContext(userId: string) {
    try {
      const [payments, requests] = await Promise.all([
        this.prisma.payment.findMany({
          where: { OR: [{ userId }, { studentId: userId }], deletedAt: null },
          select: {
            id: true,
            amount: true,
            paidAmount: true,
            pendingAmount: true,
            discountAmount: true,
            scholarshipAmount: true,
            paymentType: true,
            paymentMethod: true,
            status: true,
            verificationStatus: true,
            receiptNumber: true,
            invoiceNumber: true,
            dueDate: true,
            paidAt: true,
            college: { select: { name: true } },
            course: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.paymentRequest.findMany({
          where: { studentId: userId },
          select: {
            id: true,
            requestCode: true,
            feeHead: true,
            totalAmount: true,
            discountAmount: true,
            scholarshipAmount: true,
            lateFeeAmount: true,
            finalPayableAmount: true,
            requestedAmount: true,
            dueAmount: true,
            dueDate: true,
            status: true,
            paymentDestination: true,
            assignedRole: true,
            college: { select: { name: true } },
            course: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      const totalPaid = payments
        .filter((p) => p.status === 'COMPLETED' || p.status === 'SUCCESS')
        .reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);

      const totalPending = requests
        .filter((r) => r.status === 'PENDING' || r.status === 'PARTIALLY_PAID')
        .reduce((sum, r) => sum + (r.dueAmount || r.requestedAmount || 0), 0);

      return {
        totalPaid,
        totalPending,
        recentPayments: payments,
        pendingRequests: requests,
      };
    } catch {
      return {
        totalPaid: 0,
        totalPending: 0,
        recentPayments: [],
        pendingRequests: [],
      };
    }
  }
}
