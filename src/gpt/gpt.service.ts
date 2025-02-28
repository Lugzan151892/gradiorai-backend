import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class GptService {
  constructor(private readonly configService: ConfigService) {}
  async gerateQuestions(params: any) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    const openai = new OpenAI({ apiKey: apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      store: true,
      messages: [{ role: 'user', content: 'Сгенерируй 2 вопроса для собеседования на должность QA с тремя вариантами ответа' }],
    });

    return completion;
  }
}
