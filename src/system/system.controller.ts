import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Response, Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { GptService, IGptSettings } from '../gpt/gpt.service';

@Controller('system')
export class SystemController {
  constructor(
    private readonly authService: AuthService,
    private readonly gptService: GptService
  ) {}
  @Get('logs')
  async getLogs(@Res() res: Response, @Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const logFilePath = path.join(__dirname, '..', '..', 'logs', 'combined.log');

    if (fs.existsSync(logFilePath)) {
      const result = fs.readFile(logFilePath, 'utf-8', (err, data) => {
        if (err) {
          throw new HttpException(err.message || 'Logs failed', HttpStatus.BAD_REQUEST);
        }

        const parsedData = data.split('\r\n');
        return res.send(parsedData.slice(-100));
      });
      return result;
    } else {
      throw new HttpException('Log file not found', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('gpt-settings')
  async getGptSettings(@Req() request: Request, @Query() query: { type?: 'TEST' | 'INTERVIEW' }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!query.type || !['TEST', 'INTERVIEW'].includes(query.type)) {
      throw new HttpException(
        { message: 'Некорректно указан тип настроек TEST | INTERVIEW', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const settings = await this.gptService.getSettings(query.type);

    return settings;
  }

  @Post('update-gpt-settings')
  async updateQuestionProgress(
    @Req() request: Request,
    @Body()
    body: {
      settings: IGptSettings;
      type: 'TEST' | 'INTERVIEW';
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!body.type || !['TEST', 'INTERVIEW'].includes(body.type)) {
      throw new HttpException(
        { message: 'Не указан тип настроек TEST || INTERVIEW', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const result = await this.gptService.updateGptSettings(body.settings, body.type);

    return result;
  }
}
