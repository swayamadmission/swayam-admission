import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCareerDto } from './dto/create-career.dto';
import { UpdateCareerDto } from './dto/update-career.dto';

@Injectable()
export class CareerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCareerDto: CreateCareerDto) {
    return this.prisma.career.create({
      data: createCareerDto,
    });
  }

  async findAll() {
    return this.prisma.career.findMany();
  }

  async findOne(id: string) {
    const career = await this.prisma.career.findUnique({
      where: { id },
      include: {
        courses: {
          include: {
            course: true,
          },
        },
      },
    });
    if (!career) {
      throw new NotFoundException(`Career with ID ${id} not found`);
    }
    return career;
  }

  async update(id: string, updateCareerDto: UpdateCareerDto) {
    try {
      return await this.prisma.career.update({
        where: { id },
        data: updateCareerDto,
      });
    } catch (error) {
      throw new NotFoundException(`Career with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.career.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Career with ID ${id} not found`);
    }
  }

  async getCoursesForCareer(careerId: string) {
    return this.prisma.careerCourse.findMany({
      where: { careerId },
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
