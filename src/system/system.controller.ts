import { Controller, Get, HttpException, HttpStatus, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Response, Request } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { GptService } from 'src/gpt/gpt.service';

@Controller('system')
export class SystemController {
  constructor(
    private readonly authService: AuthService,
    private readonly gptService: GptService
  ) {}
  @Get('logs')
  async getLogs(@Res() res: Response, @Req() request: Request) {
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const user = await this.authService.getUserFromTokens(accessToken, refreshToken);

    if (!user || !user.user.admin) {
      throw new UnauthorizedException('Unauthorized or not an admin');
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
  async getGptSettings(@Query() query: { spec?: number }, @Req() request: Request) {
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const user = await this.authService.getUserFromTokens(accessToken, refreshToken);

    if (!user || !user.user.admin) {
      throw new UnauthorizedException('Unauthorized or not an admin');
    }

    if (!query.spec) {
      throw new HttpException('Specialization invalid', HttpStatus.BAD_REQUEST);
    }

    const settings = await this.gptService.getSettings(+query.spec);

    return settings;
  }
}
