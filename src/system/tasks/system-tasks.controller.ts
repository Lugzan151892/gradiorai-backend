import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Req, Res } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Request } from 'express';
import { SystemTasksService } from 'src/system/tasks/system-tasks-service';
import { ETASKS_STATUS } from '@prisma/client';

@Controller('system/tasks')
export class SystemTasksController {
  constructor(
    private readonly authService: AuthService,
    private readonly systemTasksService: SystemTasksService
  ) {}

  @Get('all')
  async getAllTasks(@Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    return await this.systemTasksService.getAllTasks();
  }

  @Get(':id')
  async getLogs(@Req() request: Request, @Param('id') id: string) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    return await this.systemTasksService.getTaskById(id);
  }

  @Post('add')
  async addNewTask(
    @Req() request: Request,
    @Body()
    body: {
      title: string;
      content: string;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const result = await this.systemTasksService.createNewTask(body, user.user.id);

    return result;
  }

  @Delete(':id')
  async deleteTaskById(@Req() request: Request, @Param('id') id: string) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    return await this.systemTasksService.deleteTaskById(id);
  }

  @Put(':id')
  async changeTaskById(
    @Req() request: Request,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      content?: string;
      status?: ETASKS_STATUS;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    return await this.systemTasksService.updateTask(id, body);
  }
}
