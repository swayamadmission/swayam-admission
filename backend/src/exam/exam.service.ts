import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createExamDto: CreateExamDto) {
    return this.prisma.exam.create({
      data: createExamDto,
    });
  }

  async findAll(query?: {
    stateId?: string;
    state?: string;
    status?: string;
    category?: string;
  }) {
    const where: any = {};
    if (query?.stateId) {
      where.OR = [
        { stateId: query.stateId },
        ...(query.state
          ? [
              {
                state: {
                  name: { equals: query.state, mode: 'insensitive' },
                },
              },
            ]
          : []),
      ];
    } else if (query?.state) {
      where.state = {
        name: { equals: query.state, mode: 'insensitive' },
      };
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.category && query.category !== 'All') {
      where.category = query.category;
    }

    return this.prisma.exam.findMany({
      where,
      include: {
        state: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        courses: {
          include: {
            course: true,
          },
        },
      },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }
    return exam;
  }

  async update(id: string, updateExamDto: UpdateExamDto) {
    try {
      return await this.prisma.exam.update({
        where: { id },
        data: updateExamDto,
      });
    } catch (error) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.exam.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }
  }

  async getCoursesForExam(examId: string) {
    return this.prisma.courseExam.findMany({
      where: { examId },
      include: {
        course: {
          include: {
            college: true,
          },
        },
      },
    });
  }
}
