import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import { GptService } from './gpt.service';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';

@Controller('gpt')
export class GptController {
  constructor(
    private readonly gptService: GptService,
    private readonly authService: AuthService
  ) {}

  @Post('generate')
  async generate(@Req() request: Request, @Body() body: { amount: number; level: number; spec: number; password: string }) {
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const isPasswordCorrect = process.env.TEST_SECRET === body.password;
    const user = await this.authService.getUserFromTokens(accessToken, refreshToken);

    if ((!user || !user.user.admin) && !isPasswordCorrect) {
      throw new UnauthorizedException('Password incorrect');
    }

    const data = await this.gptService.generateQuestions(body, user?.user.id, user?.user.admin);

    return data;
  }
}
