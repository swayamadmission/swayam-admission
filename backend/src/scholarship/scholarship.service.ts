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
    stateId?: string;
    incomeLimit?: number;
    category?: string;
    status?: string;
  }) {
    const where: Prisma.ScholarshipWhereInput = {};
    if (query?.stateId) {
      where.OR = [
        { stateId: query.stateId },
        ...(query.state
          ? [
              { state: { equals: query.state, mode: 'insensitive' as Prisma.QueryMode } },
              { states: { has: query.state } },
            ]
          : []),
      ];
    } else if (query?.state) {
      where.OR = [
        { state: { equals: query.state, mode: 'insensitive' as Prisma.QueryMode } },
        { states: { has: query.state } },
        { stateRelation: { name: { equals: query.state, mode: 'insensitive' as Prisma.QueryMode } } },
      ];
    }
    if (query?.incomeLimit) {
      where.incomeLimit = {
        gte: Number(query.incomeLimit),
      };
    }
    if (query?.category) {
      where.category = query.category;
    }
    if (query?.status) {
      where.status = query.status;
    }
    return this.prisma.scholarship.findMany({
      where,
      include: {
        stateRelation: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
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
