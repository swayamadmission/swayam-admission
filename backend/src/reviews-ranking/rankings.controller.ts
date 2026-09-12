import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RankingEngineService } from './ranking-engine.service';
import {
  CalculateRankingDto,
  ApproveRankingDto,
  PublishRankingDto,
} from './dto/reviews-ranking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingEngineService: RankingEngineService) {}

  @Get('public')
  getPublicRankings(@Query('year') year?: string, @Query() query?: any) {
    return this.rankingEngineService.getPublicRankings(
      year ? Number(year) : undefined,
      query,
    );
  }

  @Get('editions')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.view')
  getRankingEditions() {
    return this.rankingEngineService.getRankingEditions();
  }

  @Get('edition/:year')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.view')
  getEditionDetails(@Param('year') year: string, @Query() query: any) {
    return this.rankingEngineService.getEditionDetails(Number(year), query);
  }

  @Post('calculate')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('college.edit')
  calculateRanking(
    @CurrentUser() user: IUser,
    @Body() dto: CalculateRankingDto,
  ) {
    return this.rankingEngineService.calculateRanking(user, dto);
  }

  @Post('edition/:year/approve')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('roles.edit')
  approveRankingEdition(
    @Param('year') year: string,
    @CurrentUser() user: IUser,
    @Body() dto: ApproveRankingDto,
  ) {
    return this.rankingEngineService.approveRankingEdition(
      user,
      Number(year),
      dto,
    );
  }

  @Post('edition/:year/publish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('roles.edit')
  publishRankingEdition(
    @Param('year') year: string,
    @CurrentUser() user: IUser,
  ) {
    return this.rankingEngineService.publishRankingEdition(user, Number(year));
  }

  @Post('edition/:year/unpublish')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('roles.edit')
  unpublishRankingEdition(
    @Param('year') year: string,
    @CurrentUser() user: IUser,
    @Body() dto: PublishRankingDto,
  ) {
    return this.rankingEngineService.unpublishRankingEdition(
      user,
      Number(year),
      dto,
    );
  }
}
