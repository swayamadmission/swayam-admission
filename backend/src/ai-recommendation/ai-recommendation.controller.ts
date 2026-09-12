import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AiRecommendationService } from './ai-recommendation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('recommendation')
@UseGuards(JwtAuthGuard)
export class AiRecommendationController {
  constructor(
    private readonly recommendationService: AiRecommendationService,
  ) {}

  @Get('homepage')
  async getHomepageRecommendations(@CurrentUser() user: IUser) {
    return this.recommendationService.getHomepageRecommendations(user.id);
  }

  @Get('match-score/:collegeId')
  async getMatchScore(
    @CurrentUser() user: IUser,
    @Param('collegeId') collegeId: string,
  ) {
    return this.recommendationService.getMatchScore(user.id, collegeId);
  }
}
