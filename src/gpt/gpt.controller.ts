import { Body, Controller, Get, Post } from '@nestjs/common';
import { GptService } from '@/gpt/gpt.service';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Public, OptionalAuth } from '@/auth/decorators/auth.decorator';
import { User, AuthUser } from '@/auth/decorators/user.decorator';

const REDIS_TTL = 60 * 60 * 24 * 3;
const generateKey = 'gpt-generate-limit';

@Controller('gpt')
export class GptController {
  constructor(
    private readonly gptService: GptService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  @Post('generate')
  @OptionalAuth()
  async generate(@User() user: AuthUser, @Body() body: { level: number; spec: number; techs?: number[]; locale?: string }) {
    /** Пока скрываем проверку на пользователя. */
    // if (!user.user) {
    //   const isLocal = user.userIp === '::1' || !user?.userIp;

    //   if (!isLocal) {
    //     const ipExists = await this.redis.get(`${generateKey}:${user?.userIp}`);
    //     if (ipExists) {
    //       throw new HttpException(
    //         { message: `Доступ к генерации уже использован ${ipExists}!`, info: { type: 'generate' } },
    //         HttpStatus.BAD_REQUEST
    //       );
    //     } else {
    //       await this.redis.set(`${generateKey}:${user.userIp}`, new Date().getTime(), 'EX', REDIS_TTL * 1000);
    //     }
    //   }

    //   const hasCookie = request.cookies[generateKey];
    //   if (hasCookie) {
    //     throw new HttpException(
    //       { message: `Доступ к генерации уже использован!`, info: { type: 'generate' } },
    //       HttpStatus.BAD_REQUEST
    //     );
    //   } else {
    //     response.cookie(generateKey, new Date().getTime(), {
    //       maxAge: REDIS_TTL * 1000,
    //       httpOnly: true,
    //     });
    //   }
    // }

    const data = await this.gptService.generateQuestions(body, user?.user?.id, user?.user?.admin, user?.userIp, body.locale);

    return data;
  }

  @Get('advice')
  @Public()
  async generateDaylyAdvice() {
    return await this.gptService.generateGptAdvice();
  }
}
