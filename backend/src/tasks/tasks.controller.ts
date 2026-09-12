import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { RescheduleTaskDto } from './dto/reschedule-task.dto';
import { ReassignTaskDto } from './dto/reassign-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: IUser) {
    return this.tasksService.createTask(dto, user);
  }

  @Get('my')
  getMyTasks(@CurrentUser() user: IUser, @Query() query: TaskQueryDto) {
    return this.tasksService.getMyTasks(user.id, query);
  }

  @Get('team')
  @Roles('SENIOR_COUNSELOR', 'ADMIN', 'SUPER_ADMIN')
  getTeamTasks(@CurrentUser() user: IUser, @Query() query: TaskQueryDto) {
    return this.tasksService.getTeamTasks(user.id, query);
  }

  @Get('all')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAdminTasks(@CurrentUser() user: IUser, @Query() query: TaskQueryDto) {
    return this.tasksService.getAdminTasks(user.id, query);
  }

  @Get('stats')
  getStats(@CurrentUser() user: IUser) {
    return this.tasksService.getTaskStats(user.id);
  }

  @Get('team-workload')
  @Roles('SENIOR_COUNSELOR', 'ADMIN', 'SUPER_ADMIN')
  getTeamWorkload(@CurrentUser() user: IUser) {
    return this.tasksService.getSeniorCounselorTeamWorkload(user.id);
  }

  @Patch(':id/complete')
  completeTask(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: IUser,
  ) {
    return this.tasksService.completeTask(id, user, dto);
  }

  @Patch(':id/reschedule')
  rescheduleTask(
    @Param('id') id: string,
    @Body() dto: RescheduleTaskDto,
    @CurrentUser() user: IUser,
  ) {
    return this.tasksService.rescheduleTask(id, user, dto);
  }

  @Patch(':id/reassign')
  @Roles('SENIOR_COUNSELOR', 'ADMIN', 'SUPER_ADMIN')
  reassignTask(
    @Param('id') id: string,
    @Body() dto: ReassignTaskDto,
    @CurrentUser() user: IUser,
  ) {
    return this.tasksService.reassignTask(id, user, dto);
  }

  @Patch(':id/cancel')
  cancelTask(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: IUser,
  ) {
    return this.tasksService.cancelTask(id, user, reason || 'Cancelled by user');
  }

  @Post('run-escalations')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SENIOR_COUNSELOR')
  runEscalations() {
    return this.tasksService.runEscalationCheck();
  }
}
