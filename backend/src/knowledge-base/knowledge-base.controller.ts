import { Controller, Get, Param } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';

@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get('mappings/stream-to-category')
  getStreamToCategoryMappings() {
    return this.kbService.getStreamToCategoryMappings();
  }

  @Get('stream/:stream/careers')
  getCareersForStream(@Param('stream') stream: string) {
    return this.kbService.getCareersForStream(stream);
  }

  @Get('career/:id/courses')
  getCoursesForCareer(@Param('id') careerId: string) {
    return this.kbService.getCoursesForCareer(careerId);
  }

  @Get('course/:id/exams')
  getExamsForCourse(@Param('id') courseId: string) {
    return this.kbService.getExamsForCourse(courseId);
  }
}
