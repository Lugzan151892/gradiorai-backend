import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { GptService } from './gpt.service';

@Controller('gpt')
export class GptController {
  constructor(private readonly gptService: GptService) {}

  @Post('generate')
  async generate(@Body() body: { amount: number; level: number; spec: number; password: string }) {
    const isPasswordCorrect = process.env.TEST_SECRET === body.password;

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Password incorrect');
    }

    const data = await this.gptService.gerateQuestions(body);

    return {
      data,
    };
  }
}
