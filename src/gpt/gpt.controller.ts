import { Body, Controller, HttpException, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { GptService } from './gpt.service';
import { AuthService } from '../auth/auth.service';
import { Request, Response } from 'express';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { getIpFromRequest } from '../utils/request';

const REDIS_TTL = 60 * 60 * 24 * 3;
const generateKey = 'gpt-generate-limit';

@Controller('gpt')
export class GptController {
  constructor(
    private readonly gptService: GptService,
    private readonly authService: AuthService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  @Post('generate')
  async generate(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() body: { level: number; spec: number; techs?: number[] }
  ) {
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const ip = getIpFromRequest(request);

    const user = await this.authService.getUserFromTokens(accessToken, refreshToken, ip);

    if (!user) {
      const isLocal = ip === '::1' || !ip;

      if (!isLocal) {
        const ipExists = await this.redis.get(`${generateKey}:${ip}`);
        if (ipExists) {
          throw new HttpException(
            { message: `Доступ к генерации уже использован ${ipExists}!`, info: { type: 'generate' } },
            HttpStatus.BAD_REQUEST
          );
        } else {
          await this.redis.set(`${generateKey}:${ip}`, new Date().getTime(), 'EX', REDIS_TTL * 1000);
        }
      }

      const hasCookie = request.cookies[generateKey];
      if (hasCookie) {
        throw new HttpException(
          { message: `Доступ к генерации уже использован!`, info: { type: 'generate' } },
          HttpStatus.BAD_REQUEST
        );
      } else {
        response.cookie(generateKey, new Date().getTime(), {
          maxAge: REDIS_TTL * 1000,
          httpOnly: true,
        });
      }
    }

    const data = await this.gptService.generateQuestions(body, user?.user.id, user?.user.admin);

    return data;
  }
}
