import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import {
  SubmitCollegeReviewDto,
  SubmitCounselorReviewDto,
  SubmitSupportReviewDto,
  ModerateReviewDto,
  FileComplaintDto,
} from './dto/reviews-ranking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('counselor')
  @UseGuards(JwtAuthGuard)
  submitCounselorReview(
    @CurrentUser() user: IUser,
    @Body() dto: SubmitCounselorReviewDto,
  ) {
    return this.reviewsService.submitCounselorReview(user, dto);
  }

  @Post('college')
  @UseGuards(JwtAuthGuard)
  submitCollegeReview(
    @CurrentUser() user: IUser,
    @Body() dto: SubmitCollegeReviewDto,
  ) {
    return this.reviewsService.submitCollegeReview(user, dto);
  }

  @Post('support')
  @UseGuards(JwtAuthGuard)
  submitSupportReview(
    @CurrentUser() user: IUser,
    @Body() dto: SubmitSupportReviewDto,
  ) {
    return this.reviewsService.submitSupportReview(user, dto);
  }

  @Post('complaints')
  @UseGuards(JwtAuthGuard)
  fileComplaint(@CurrentUser() user: IUser, @Body() dto: FileComplaintDto) {
    return this.reviewsService.fileComplaint(user, dto);
  }

  @Get('moderation/queue')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('roles.view')
  getModerationQueue(@CurrentUser() user: IUser, @Query() query: any) {
    return this.reviewsService.getModerationQueue(user, query);
  }

  @Post(':id/moderate-college')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('roles.edit')
  moderateCollegeReview(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderateCollegeReview(user, id, dto);
  }

  @Post(':id/moderate-counselor')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('roles.edit')
  moderateCounselorReview(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderateCounselorReview(user, id, dto);
  }

  @Get('public/colleges/:collegeId')
  getCollegeReviewsPublic(
    @Param('collegeId') collegeId: string,
    @Query() query: any,
  ) {
    return this.reviewsService.getCollegeReviewsPublic(collegeId, query);
  }
}
