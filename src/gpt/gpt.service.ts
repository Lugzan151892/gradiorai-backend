import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getSkillLevel, getSpecText } from './utils';
import { ESKILL_LEVEL, ETEST_SPEC } from '../utils/interfaces/enums';
import { QuestionsService } from 'src/questions/questions.service';

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
  constructor(
    private readonly configService: ConfigService,
    private readonly questionService: QuestionsService
  ) {}
  async generateQuestions(
    params: { level: ESKILL_LEVEL; spec: ETEST_SPEC; techs?: number[] },
    userId?: number,
    isAdmin?: boolean
  ) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    let questionsAmount = 10;
    let questions = [];
    if (!isAdmin) {
      const questionsFromDatabase = await this.questionService.getNonPassedQuestions(
        params.level,
        params.spec,
        questionsAmount,
        userId,
        params.techs
      );

      console.log(questionsFromDatabase.length);

      if (questionsFromDatabase.length >= questionsAmount) {
        return {
          response: questionsFromDatabase.slice(0, questionsAmount),
          usage: null,
        };
      } else {
        console.log(questionsFromDatabase.length);
        questionsAmount -= questionsFromDatabase.length;
        console.log(questionsAmount);
        questions = [...questionsFromDatabase];
      }
    }

    const questionTechs = await this.questionService.getTechsById(params.techs);

    const openai = new OpenAI({ apiKey: apiKey });
    const completion: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      store: true,
      messages: [
        {
          role: 'system',
          content: `У тебя 20 лет опыта в разработке. Ты — опытный senior ${getSpecText(params.spec)} с большим опытом проведения технических собеседований. Твоя задача — составить список качественных вопросов для интервью ${getSkillLevel(params.level)} ${getSpecText(params.spec)}. Варианты ответов должны быть реалистичными и не слишком очевидными, чтобы проверить глубину знаний
          Используй реальные кейсы.
          Пожалуйста, генерируй список вопросов с ответами, где для каждого ответа поле "id" должно быть целым числом больше 0.`,
        },
        {
          role: 'user',
          content: `Сгенерируй ${questionsAmount} вопроса для собеседования на должность
          ${getSkillLevel(params.level)} ${getSpecText(params.spec)} с 4 вариантами ответа. ${questionTechs.length ? `Вопросы должны касаться следующих технологий: ${questionTechs.map((el) => el.name).join(', ')}.` : ''}
          Должен быть один правильный ответ и 3 неправильных.`,
        },
      ],
      response_format: zodResponseFormat(GPTResponse, 'event'),
      temperature: 1,
    });

    return {
      response: {
        questions: [...questions, ...JSON.parse(completion.choices[0].message.content).questions],
      },
      usage: completion.usage,
    };
  }
}
