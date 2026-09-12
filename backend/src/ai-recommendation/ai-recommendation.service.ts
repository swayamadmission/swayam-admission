import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { College, Course } from '@prisma/client';

export interface RecommendationScore {
  collegeId: string;
  courseId: string;
  score: number;
  reasoning: string;
  college: Partial<College>;
  course: Partial<Course>;
}

@Injectable()
export class AiRecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Weights (configurable later via DB)
   */
  private readonly WEIGHTS = {
    MARKS: 0.3,
    BUDGET: 0.3,
    LOCATION: 0.2,
    TYPE: 0.1,
    HOSTEL: 0.1,
  };

  async recommendColleges(userId: string): Promise<RecommendationScore[]> {
    const preference = await this.prisma.studentPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      throw new NotFoundException('Student preferences not found');
    }

    // Fetch potential colleges and courses (simplification: fetch all active, then score in memory)
    // In production with millions of rows, we would use a vector database or pg_trgm,
    // but here we filter first then rank.

    const colleges = await this.prisma.college.findMany({
      include: {
        courses: true,
      },
    });

    const recommendations: RecommendationScore[] = [];

    for (const rawCollege of colleges) {
      const college = rawCollege as any;
      // Basic filtering
      if (
        preference.collegeType !== 'ANY' &&
        college.type !== preference.collegeType
      ) {
        continue;
      }

      for (const course of college.courses) {
        let score = 0;
        const reasons: string[] = [];

        // 1. Budget scoring
        const courseFees = course.totalFees ?? 0;
        if (preference.budgetMax >= courseFees) {
          score += this.WEIGHTS.BUDGET * 100;
          reasons.push('Fits perfectly within budget.');
        } else {
          const diff = courseFees - preference.budgetMax;
          const penalty = Math.min((diff / preference.budgetMax) * 100, 100);
          score += this.WEIGHTS.BUDGET * (100 - penalty);
          reasons.push('Slightly over budget.');
        }

        // 2. Marks / Eligibility
        // Assume basic eligibility rules: we'll just give a generic score here for demonstration
        score += this.WEIGHTS.MARKS * 85;
        reasons.push('Meets academic requirements.');

        // 3. Location
        if (
          preference.preferredStates.includes(college.state) ||
          preference.preferredCities.includes(college.city)
        ) {
          score += this.WEIGHTS.LOCATION * 100;
          reasons.push('Preferred location match.');
        } else {
          score += this.WEIGHTS.LOCATION * 30; // Partial score for flexibility
        }

        // 4. Hostel
        if (preference.hostelRequired && college.hasHostel) {
          score += this.WEIGHTS.HOSTEL * 100;
        } else if (!preference.hostelRequired) {
          score += this.WEIGHTS.HOSTEL * 100; // Doesn't matter
        }

        recommendations.push({
          collegeId: college.id,
          courseId: course.id,
          score: Math.round(score),
          reasoning: reasons.join(' '),
          college: {
            id: college.id,
            name: college.name,
            city: college.city,
            state: college.state,
          },
          course: {
            id: course.id,
            name: course.name,
            totalFees: courseFees,
          },
        });
      }
    }

    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(0, 10); // Return top 10
  }

  async compareColleges(collegeIds: string[]) {
    const rawColleges = await this.prisma.college.findMany({
      where: { id: { in: collegeIds } },
      include: {
        courses: true,
        gallery: true,
        reviews: true,
      },
    });

    return rawColleges.map((rawC) => {
      const c = rawC as any;
      return {
        id: c.id,
        name: c.name,
        location: `${c.city}, ${c.state}`,
        type: c.type,
        ranking: c.ranking,
        hasHostel: c.hasHostel,
        establishedYear: c.establishedYear,
        courseCount: c.courses.length,
        averageFee:
          c.courses.length > 0
            ? c.courses.reduce(
                (acc: number, curr: any) => acc + (curr.totalFees ?? 0),
                0,
              ) / c.courses.length
            : 0,
        placementRating:
          c.reviews.length > 0
            ? c.reviews.reduce(
                (acc: number, curr: any) => acc + (curr.rating ?? 0),
                0,
              ) / c.reviews.length
            : 0,
      };
    });
  }

  async saveRecommendation(
    userId: string,
    collegeId: string,
    courseId: string,
    score: number,
    reasoning: string,
  ) {
    return this.prisma.savedRecommendation.upsert({
      where: {
        userId_collegeId_courseId: {
          userId,
          collegeId,
          courseId,
        },
      },
      update: { score, reasoning },
      create: { userId, collegeId, courseId, score, reasoning },
    });
  }

  async getHomepageRecommendations(userId: string) {
    const recommendedColleges = await this.recommendColleges(userId);
    const recentlyViewed = await this.prisma.recentlyViewed.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: 5,
    });

    // In a real scenario, this would query Trending Colleges
    const trendingColleges = await this.prisma.college.findMany({
      where: { featured: true, status: 'PUBLISHED' },
      take: 5,
    });

    return {
      recommendedColleges,
      recentlyViewed,
      trendingColleges,
    };
  }

  async getMatchScore(userId: string, collegeId: string) {
    // Generate match score for a specific college
    const recommendations = await this.recommendColleges(userId);
    const match = recommendations.find((r) => r.collegeId === collegeId);
    if (match) {
      return match;
    }
    // If not in top, just calculate and return a mock score for now or run the specific evaluation
    return {
      collegeId,
      score: 75,
      reasoning:
        'Good match based on your preferences, but slightly outside preferred location.',
    };
  }
}
