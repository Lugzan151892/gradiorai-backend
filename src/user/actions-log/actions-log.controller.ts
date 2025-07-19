import { Controller, Get, HttpException, HttpStatus, Req, Res } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Request } from 'express';
import { ActionsLogService } from './actions-log.service';

@Controller('user/actions-log')
export class ActionsLogController {
  constructor(
    private readonly authService: AuthService,
    private readonly actionsLogService: ActionsLogService
  ) {}
  @Get('logs')
  async getLogs(@Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const result = await this.actionsLogService.getLogs();

    return result;
  }
}
