import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminMetrics() {
    return {
      overview: await this.getOverviewMetrics(),
      charts: {
        trend: await this.getTrendChart(),
        pipeline: await this.getPipelineChart(),
        states: await this.getStatePerformance(),
      },
      counselors: await this.getTopCounselors(),
      recentLeads: await this.getRecentLeads(),
    };
  }

  private async getOverviewMetrics() {
    const [totalStudents, totalLeads, totalApplications, totalColleges] =
      await Promise.all([
        this.prisma.user.count({ where: { role: 'STUDENT' } }),
        this.prisma.lead.count({ where: { isDeleted: false } }),
        this.prisma.application.count(),
        this.prisma.college.count(),
      ]);

    return { totalStudents, totalLeads, totalApplications, totalColleges };
  }

  private async getTrendChart() {
    // Generate last 7 days including today
    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    const startOfWeek = days[0];
    const endOfWeek = new Date(days[6]);
    endOfWeek.setHours(23, 59, 59, 999);

    const [leads, conversions] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          isDeleted: false,
          createdAt: { gte: startOfWeek, lte: endOfWeek },
        },
        select: { createdAt: true },
      }),
      this.prisma.application.findMany({
        where: {
          status: 'STUDENT_ENROLLED',
          createdAt: { gte: startOfWeek, lte: endOfWeek },
        },
        select: { createdAt: true },
      }),
    ]);

    const formatDay = (d: Date) =>
      d.toLocaleDateString('en-US', { weekday: 'short' });
    const result = days.map((date) => {
      const dateStr = date.toDateString();
      const dailyLeads = leads.filter(
        (l) => l.createdAt.toDateString() === dateStr,
      ).length;
      const dailyConvs = conversions.filter(
        (c) => c.createdAt.toDateString() === dateStr,
      ).length;
      return {
        day: formatDay(date),
        leads: dailyLeads,
        conversions: dailyConvs,
      };
    });

    return result;
  }

  private async getPipelineChart() {
    const group = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { isDeleted: false },
      _count: { id: true },
    });

    const statusMap: Record<string, { name: string; color: string }> = {
      NEW: { name: 'New', color: '#94A3B8' },
      CONTACTED: { name: 'Contacted', color: '#4A7B5B' },
      INTERESTED: { name: 'Interested', color: '#F0AE1A' },
      FOLLOW_UP: { name: 'Follow-up', color: '#F97316' },
      APPLICATION_STARTED: { name: 'Applied', color: '#0EA5E9' },
      CONVERTED: { name: 'Confirmed', color: '#10B981' },
      LOST: { name: 'Lost', color: '#EF4444' },
    };

    return group.map((g) => {
      const mapped = statusMap[g.status] || {
        name: g.status,
        color: '#94A3B8',
      };
      return {
        name: mapped.name,
        value: g._count.id,
        color: mapped.color,
      };
    });
  }

  private async getStatePerformance() {
    const group = await this.prisma.lead.groupBy({
      by: ['state'],
      where: { isDeleted: false, state: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    return group.map((g) => ({
      state: g.state,
      leads: g._count.id,
    }));
  }

  private async getTopCounselors() {
    const counselors = await this.prisma.user.findMany({
      where: { role: 'COUNSELOR' },
      select: {
        id: true,
        fullName: true,
        assignedLeads: {
          where: { isDeleted: false },
          select: { id: true, status: true },
        },
      },
    });

    const ranked = counselors.map((c) => {
      const leadsCount = c.assignedLeads.length;
      const convertedCount = c.assignedLeads.filter(
        (l) => l.status === 'CONVERTED',
      ).length;
      return {
        name: c.fullName,
        leads: leadsCount,
        converted: convertedCount,
      };
    });

    ranked.sort((a, b) => b.converted - a.converted || b.leads - a.leads);
    return ranked.slice(0, 5);
  }

  private async getRecentLeads() {
    const leads = await this.prisma.lead.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        preferredCourse: true,
        city: true,
        status: true,
        createdAt: true,
      },
    });

    const statusMap: Record<string, string> = {
      NEW: 'New',
      CONTACTED: 'Contacted',
      INTERESTED: 'Interested',
      FOLLOW_UP: 'Follow-up',
      APPLICATION_STARTED: 'Applied',
      CONVERTED: 'Confirmed',
      LOST: 'Lost',
    };

    return leads.map((l) => {
      const msAgo = Date.now() - l.createdAt.getTime();
      const minAgo = Math.floor(msAgo / 60000);
      const hrAgo = Math.floor(minAgo / 60);
      let timeStr = 'Just now';
      if (hrAgo > 24) {
        timeStr = `${Math.floor(hrAgo / 24)}d ago`;
      } else if (hrAgo > 0) {
        timeStr = `${hrAgo} hr ago`;
      } else if (minAgo > 0) {
        timeStr = `${minAgo} min ago`;
      }

      return {
        id: l.id,
        name: l.fullName,
        course: l.preferredCourse || 'Not specified',
        city: l.city || 'Not specified',
        stage: statusMap[l.status] || l.status,
        time: timeStr,
        avatar: l.fullName.charAt(0).toUpperCase(),
      };
    });
  }

  async getCounselorMetrics(counselorId: string) {
    const assignedLeads = await this.prisma.lead.count({
      where: { assignedCounselorId: counselorId },
    });
    const assignedApplications = await this.prisma.application.count({
      where: { counselorId },
    });
    const pendingTasks = await this.prisma.task.count({
      where: {
        assignedTo: counselorId,
        status: 'PENDING',
      },
    });

    return {
      performance: {
        assignedLeads,
        assignedApplications,
        pendingTasks,
      },
    };
  }

  async getStudentSummary(studentId: string) {
    const applications = await this.prisma.application.findMany({
      where: { userId: studentId },
      include: {
        college: { select: { name: true } },
        course: { select: { name: true } },
      },
    });

    const pendingDocuments = await this.prisma.document.findMany({
      where: { userId: studentId, status: DocumentStatus.REJECTED }, // Needs attention
    });

    const pendingPayments = await this.prisma.payment.findMany({
      where: { userId: studentId, status: PaymentStatus.PENDING },
    });

    return {
      applications,
      actionRequired: {
        documents: pendingDocuments,
        payments: pendingPayments,
      },
    };
  }
}
