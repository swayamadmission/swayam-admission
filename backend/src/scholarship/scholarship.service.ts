import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScholarshipDto } from './dto/create-scholarship.dto';
import { UpdateScholarshipDto } from './dto/update-scholarship.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ScholarshipService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createScholarshipDto: CreateScholarshipDto) {
    return this.prisma.scholarship.create({
      data: createScholarshipDto,
    });
  }

  async findAll(query?: {
    state?: string;
    incomeLimit?: number;
    category?: string;
  }) {
    const where: Prisma.ScholarshipWhereInput = {};
    if (query?.state) {
      where.state = query.state;
    }
    if (query?.incomeLimit) {
      where.incomeLimit = {
        gte: Number(query.incomeLimit), // Usually scholarships require income <= limit, so if we search for a specific limit... wait, if a student has income X, they can apply if scholarship.incomeLimit >= X.
      };
    }
    if (query?.category) {
      where.category = query.category;
    }
    return this.prisma.scholarship.findMany({ where });
  }

  async findOne(id: string) {
    const scholarship = await this.prisma.scholarship.findUnique({
      where: { id },
    });
    if (!scholarship) {
      throw new NotFoundException(`Scholarship with ID ${id} not found`);
    }
    return scholarship;
  }

  async update(id: string, updateScholarshipDto: UpdateScholarshipDto) {
    try {
      return await this.prisma.scholarship.update({
        where: { id },
        data: updateScholarshipDto,
      });
    } catch (error) {
      throw new NotFoundException(`Scholarship with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.scholarship.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Scholarship with ID ${id} not found`);
    }
  }
}
