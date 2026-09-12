import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AudienceBuilderService,
  AudienceFilterPayload,
  SaveAudienceDto,
  UpdateSavedAudienceDto,
  PreviewAudienceDto,
} from './audience-builder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';
import { SavedAudienceStatus } from '@prisma/client';

@Controller('notifications/audience')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AudienceController {
  constructor(private readonly audienceBuilder: AudienceBuilderService) {}

  @Get('meta')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  getFilterMetaOptions() {
    return this.audienceBuilder.getFilterMetaOptions();
  }

  @Post('preview')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  previewAudience(@Body() payload: PreviewAudienceDto) {
    return this.audienceBuilder.previewAudience(payload.filter || ({} as any), payload.channels || ['IN_APP', 'EMAIL']);
  }

  // ─── SAVED AUDIENCES / SEGMENTS ──────────────────────────────────────────

  @Get('saved')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  getSavedAudiences(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: SavedAudienceStatus,
    @Query('entityType') entityType?: string,
  ) {
    return this.audienceBuilder.getSavedAudiences({
      page,
      limit,
      search,
      status,
      entityType,
    });
  }

  @Get('saved/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  getSavedAudienceById(@Param('id') id: string) {
    return this.audienceBuilder.getSavedAudienceById(id);
  }

  @Post('saved')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  createSavedAudience(
    @Body() dto: SaveAudienceDto,
    @CurrentUser() user: IUser,
  ) {
    return this.audienceBuilder.createSavedAudience(dto, user?.id);
  }

  @Patch('saved/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  updateSavedAudience(
    @Param('id') id: string,
    @Body() dto: UpdateSavedAudienceDto,
    @CurrentUser() user: IUser,
  ) {
    return this.audienceBuilder.updateSavedAudience(id, dto, user?.id);
  }

  @Post('saved/:id/duplicate')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  duplicateSavedAudience(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.audienceBuilder.duplicateSavedAudience(id, user?.id);
  }

  @Patch('saved/:id/archive')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  archiveSavedAudience(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.audienceBuilder.archiveSavedAudience(id, user?.id);
  }

  @Delete('saved/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  deleteSavedAudience(
    @Param('id') id: string,
    @CurrentUser() user: IUser,
  ) {
    return this.audienceBuilder.archiveSavedAudience(id, user?.id);
  }
}
