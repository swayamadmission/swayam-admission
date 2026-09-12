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

  async findAll() {
    return this.prisma.exam.findMany();
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
