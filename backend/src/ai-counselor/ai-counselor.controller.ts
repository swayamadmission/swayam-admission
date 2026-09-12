import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AiCounselorService } from './ai-counselor.service';
import { AnalyzeDto } from './dto/analyze.dto';
import { SaveRecommendationDto } from './dto/save-recommendation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('ai-counselor')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiCounselorController {
  constructor(private aiCounselorService: AiCounselorService) {}

  @Post('analyze')
  analyze(@CurrentUser() user: IUser, @Body() dto: AnalyzeDto) {
    return this.aiCounselorService.analyze(user.id, dto);
  }

  @Get('history')
  getHistory(@CurrentUser() user: IUser) {
    return this.aiCounselorService.getHistory(user.id);
  }

  @Get('recommendations')
  getRecommendations(@CurrentUser() user: IUser) {
    return this.aiCounselorService.getRecommendations(user.id);
  }

  @Post('save')
  saveRecommendation(
    @CurrentUser() user: IUser,
    @Body() dto: SaveRecommendationDto,
  ) {
    return this.aiCounselorService.saveRecommendation(user.id, dto);
  }

  @Delete('recommendations/:id')
  deleteRecommendation(@CurrentUser() user: IUser, @Param('id') id: string) {
    return this.aiCounselorService.deleteRecommendation(user.id, id);
  }
}
