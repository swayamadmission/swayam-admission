import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  TemplateEngineService,
  CreateTemplateDto,
  UpdateTemplateDto,
  PreviewTemplateDto,
} from './template-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('notifications/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationTemplateController {
  constructor(private readonly templateEngine: TemplateEngineService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('channel') channel?: string,
  ) {
    return this.templateEngine.findAll({ search, category, channel });
  }

  @Get(':idOrCode')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR')
  findOne(@Param('idOrCode') idOrCode: string) {
    return this.templateEngine.findOne(idOrCode);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  create(@Body() dto: CreateTemplateDto, @CurrentUser() user: IUser) {
    return this.templateEngine.createTemplate(dto, user?.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templateEngine.updateTemplate(id, dto);
  }

  @Post('preview')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  renderPreview(@Body() payload: PreviewTemplateDto) {
    return this.templateEngine.renderPreview(payload.templateIdOrCode, payload.sampleData);
  }

  @Post('seed-defaults')
  @Roles('ADMIN', 'SUPER_ADMIN', 'COUNSELOR', 'SENIOR_COUNSELOR')
  seedDefaults() {
    return this.templateEngine.seedDefaultTemplates();
  }
}
