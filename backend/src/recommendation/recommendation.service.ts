import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateRecommendationDto } from './dto/generate-recommendation.dto';
import { KnowledgeBaseService } from '../knowledge-base/knowledge-base.service';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kbService: KnowledgeBaseService,
  ) {}

  async generate(dto: GenerateRecommendationDto) {
    const { stream, budgetMax, preferredStates, category } = dto;

    // 1. Careers based on stream
    const careers = await this.kbService.getCareersForStream(stream);

    // 2. Map stream to course categories
    const mappings = this.kbService.getStreamToCategoryMappings();
    const categories = mappings[stream.toUpperCase()] || [];

    // 3. Find Courses (and their Colleges) matching categories, budget, and states
    // Course fee <= budgetMax. If budgetMax is missing, ignore fee check.
    const courseWhere: any = {};

    if (categories.length > 0) {
      courseWhere.category = { in: categories };
    }

    if (budgetMax) {
      courseWhere.totalFees = { lte: budgetMax };
    }

    const collegeWhere: any = {};
    if (preferredStates && preferredStates.length > 0) {
      collegeWhere.state = { in: preferredStates };
    }

    const courses = await this.prisma.course.findMany({
      where: {
        ...courseWhere,
        college: collegeWhere,
      },
      include: {
        college: true,
      },
      take: 20, // Limit results
      orderBy: { college: { ranking: 'asc' } }, // Assuming ranking 1 is best, but ranking can be null.
    });

    // Extract unique colleges from the courses
    const collegesMap = new Map();
    courses.forEach((c) => {
      if (!collegesMap.has(c.collegeId)) {
        collegesMap.set(c.collegeId, c.college);
      }
    });
    const colleges = Array.from(collegesMap.values());

    // 4. Find Scholarships based on state and category
    const scholarshipWhere: any = {};
    if (preferredStates && preferredStates.length > 0) {
      scholarshipWhere.state = { in: preferredStates };
    }
    // Simple category mapping if needed, or we just return state-based for now.

    const scholarships = await this.prisma.scholarship.findMany({
      where: scholarshipWhere,
      take: 10,
    });

    return {
      careers,
      colleges,
      courses,
      scholarships,
    };
  }
}
