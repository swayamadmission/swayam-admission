import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

  // Centralized service to fetch mapping rules.

  async getCareersForStream(stream: string) {
    return this.prisma.career.findMany({
      where: {
        stream: { equals: stream, mode: 'insensitive' },
      },
    });
  }

  async getCoursesForCareer(careerId: string) {
    const careerCourses = await this.prisma.careerCourse.findMany({
      where: { careerId },
      include: { course: true },
    });
    return careerCourses.map((cc) => cc.course);
  }

  async getExamsForCourse(courseId: string) {
    const courseExams = await this.prisma.courseExam.findMany({
      where: { courseId },
      include: { exam: true },
    });
    return courseExams.map((ce) => ce.exam);
  }

  // Common mapping functions could be added here as the AI counselor grows.
  // Example: Which streams can lead to a specific category of courses.
  getStreamToCategoryMappings(): Record<string, string[]> {
    return {
      SCIENCE: [
        'ENGINEERING',
        'MEDICAL',
        'SCIENCE',
        'COMPUTER_APPLICATIONS',
        'AGRICULTURE',
        'PHARMACY',
      ],
      COMMERCE: ['COMMERCE', 'MANAGEMENT', 'COMPUTER_APPLICATIONS', 'ARTS'],
      ARTS: ['ARTS', 'LAW', 'EDUCATION', 'DESIGN', 'HOTEL_MANAGEMENT'],
      OTHER: ['OTHER', 'CERTIFICATE', 'DIPLOMA'],
    };
  }
}
