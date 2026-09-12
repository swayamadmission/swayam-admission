import { Controller, Post, Body } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { GenerateRecommendationDto } from './dto/generate-recommendation.dto';

@Controller('recommendation')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Post('generate')
  generate(@Body() dto: GenerateRecommendationDto) {
    return this.recommendationService.generate(dto);
  }
}
