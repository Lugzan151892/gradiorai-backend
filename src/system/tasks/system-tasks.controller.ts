import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { SystemTasksService } from 'src/system/tasks/system-tasks-service';
import { ETASKS_STATUS } from '@prisma/client';
import { AuthUser, User } from '@/auth/decorators/user.decorator';
import { RequireAdmin } from '@/auth/decorators/auth.decorator';

@Controller('system/tasks')
export class SystemTasksController {
  constructor(private readonly systemTasksService: SystemTasksService) {}

  @Get('all')
  @RequireAdmin()
  async getAllTasks() {
    return await this.systemTasksService.getAllTasks();
  }

  @Get('generate')
  @RequireAdmin()
  async getGptTasks() {
    return await this.systemTasksService.generateTaskFromGpt();
  }

  @Get(':id')
  @RequireAdmin()
  async getTaskById(@Param('id') id: string) {
    return await this.systemTasksService.getTaskById(id);
  }

  @Post('add')
  @RequireAdmin()
  async addNewTask(
    @User() user: AuthUser,
    @Body()
    body: {
      title: string;
      content: string;
    }
  ) {
    return await this.systemTasksService.createNewTask(body, user?.user?.id);
  }

  @Delete(':id')
  @RequireAdmin()
  async deleteTaskById(@Param('id') id: string) {
    return await this.systemTasksService.deleteTaskById(id);
  }

  @Put(':id')
  @RequireAdmin()
  async changeTaskById(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      content?: string;
      status?: ETASKS_STATUS;
    }
  ) {
    return await this.systemTasksService.updateTask(id, body);
  }
}
