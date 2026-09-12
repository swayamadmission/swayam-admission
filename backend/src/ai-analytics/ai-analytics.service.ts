import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tracks an AI session outcome
   */
  async trackSession(data: {
    userId: string;
    conversationId: string;
    queryCategory: string;
    recommendationAccepted?: boolean;
    studentSatisfactionScore?: number;
    converted?: boolean;
  }) {
    return this.prisma.aIAnalytics.upsert({
      where: { conversationId: data.conversationId },
      update: {
        queryCategory: data.queryCategory,
        recommendationAccepted: data.recommendationAccepted,
        studentSatisfactionScore: data.studentSatisfactionScore,
        converted: data.converted,
      },
      create: {
        userId: data.userId,
        conversationId: data.conversationId,
        queryCategory: data.queryCategory,
        recommendationAccepted: data.recommendationAccepted || false,
        studentSatisfactionScore: data.studentSatisfactionScore,
        converted: data.converted || false,
      },
    });
  }

  /**
   * Get analytics dashboard metrics for Admin Panel
   */
  async getDashboardMetrics() {
    const [totalSessions, convertedSessions, avgSatisfaction, popularQueries] =
      await Promise.all([
        this.prisma.aIAnalytics.count(),
        this.prisma.aIAnalytics.count({ where: { converted: true } }),
        this.prisma.aIAnalytics.aggregate({
          _avg: { studentSatisfactionScore: true },
        }),
        this.prisma.aIAnalytics.groupBy({
          by: ['queryCategory'],
          _count: { queryCategory: true },
          orderBy: { _count: { queryCategory: 'desc' } },
          take: 5,
        }),
      ]);

    const conversionRate =
      totalSessions > 0 ? (convertedSessions / totalSessions) * 100 : 0;

    return {
      usage: {
        totalSessions,
        conversionRate,
        averageSatisfaction: avgSatisfaction._avg.studentSatisfactionScore || 0,
      },
      popularQueries: popularQueries.map((q) => ({
        category: q.queryCategory,
        count: q._count.queryCategory,
      })),
    };
  }
}
