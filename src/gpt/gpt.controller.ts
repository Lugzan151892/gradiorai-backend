import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, Res, Sse } from '@nestjs/common';
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
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      const isLocal = user.userIp === '::1' || !user.userIp;

      if (!isLocal) {
        const ipExists = await this.redis.get(`${generateKey}:${user.userIp}`);
        if (ipExists) {
          throw new HttpException(
            { message: `Доступ к генерации уже использован ${ipExists}!`, info: { type: 'generate' } },
            HttpStatus.BAD_REQUEST
          );
        } else {
          await this.redis.set(`${generateKey}:${user.userIp}`, new Date().getTime(), 'EX', REDIS_TTL * 1000);
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
