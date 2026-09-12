import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CareerService } from './career.service';
import { CreateCareerDto } from './dto/create-career.dto';
import { UpdateCareerDto } from './dto/update-career.dto';

@Controller('careers')
export class CareerController {
  constructor(private readonly careerService: CareerService) {}

  @Post()
  create(@Body() createCareerDto: CreateCareerDto) {
    return this.careerService.create(createCareerDto);
  }

  @Get()
  findAll() {
    return this.careerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.careerService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCareerDto: UpdateCareerDto) {
    return this.careerService.update(id, updateCareerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.careerService.remove(id);
  }

  @Get(':id/courses')
  getCoursesForCareer(@Param('id') id: string) {
    return this.careerService.getCoursesForCareer(id);
  }
}
