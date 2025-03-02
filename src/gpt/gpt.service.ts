import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getSkillLevel, getSpecText } from './utils';
import { ESKILL_LEVEL, ETEST_SPEC } from 'src/utils/interfaces/enums';

const GPTResponse = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      responses: z.array(
        z.object({
          answer: z.string(),
          correct: z.boolean(),
          id: z.number(),
        })
      ),
    })
  ),
});

@Injectable()
export class GptService {
  constructor(private readonly configService: ConfigService) {}
  async generateQuestions(params: { amount: number; level: ESKILL_LEVEL; spec: ETEST_SPEC }) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    const openai = new OpenAI({ apiKey: apiKey });
    const completion: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      store: true,
      messages: [
        {
          role: 'system',
          content: `Ты опытный сеньор архитектор. Тебе нужно провести собеседование с ${getSpecText(params.spec)}. Он пришел на вакансию уровня ${getSkillLevel(params.level)} 
          Пожалуйста, генерируй список вопросов с ответами, где для каждого ответа поле "id" должно быть целым числом больше 0. Правильный ответ не должен быть всегда первым. Размести в случайно порядке.`,
        },
        {
          role: 'user',
          content: `Сгенерируй ${params.amount} вопроса для собеседования на должность
          ${getSkillLevel(params.level)} ${getSpecText(params.spec)} с 4 вариантами ответа. Вопросы генерируй соответствующие должности. Вопросы генерируй разной длины, чередуй короткие и развернутые.
          Ответы тоже генерируй разной длины, чередуй короткие и развернутые. Ответы должны максимально путать, то есть должен быть один правильный ответ и 3 неправильных, но подходящих по смыслу к теме вопроса.`,
        },
      ],
      response_format: zodResponseFormat(GPTResponse, 'event'),
    });

    return {
      data: {
        response: completion.choices[0].message.content,
        usage: completion.usage,
      },
    };
  }
}
