import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  defaultAdminAmount,
  defaultAdminModel,
  defaultSystemMessage,
  defaultTemperature,
  defaultUserAmount,
  defaultUserMessage,
  defaultUserModel,
  getSkillLevel,
  replacePromptKeywords,
} from './utils';
import { ESKILL_LEVEL } from '../utils/interfaces/enums';
import { QuestionsService } from '../questions/questions.service';
import { PrismaService } from '../prisma/prisma.service';
import { Observable, Subject } from 'rxjs';
import { Stream } from 'openai/streaming';
import { IGPTStreamMessageEvent } from '../utils/interfaces/gpt/interfaces';

export interface IGptSettings {
  id?: number;
  user_model: 'gpt-4o-mini' | 'gpt-4o';
  admin_model: 'gpt-4o-mini' | 'gpt-4o';
  system_message: string;
  user_message: string;
  admin_amount: number;
  user_amount: number;
  temperature: number;
}

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
  private stream$ = new Subject<IGPTStreamMessageEvent>();

  constructor(
    private readonly configService: ConfigService,
    private readonly questionService: QuestionsService,
    private readonly prismaService: PrismaService
  ) {}

  getDefaultSettings(): IGptSettings {
    return {
      user_model: defaultUserModel,
      admin_model: defaultAdminModel,
      system_message: defaultSystemMessage,
      user_message: defaultUserMessage,
      admin_amount: defaultAdminAmount,
      user_amount: defaultUserAmount,
      temperature: defaultTemperature,
    };
  }

  async getSettings() {
    const settings = (await this.prismaService.gptSettings.findFirst()) as IGptSettings;

    if (settings) {
      return settings;
    }

    return this.getDefaultSettings();
  }

  async updateGptSettings(settings: IGptSettings) {
    const newSettings = settings;
    if (!settings.id) {
      delete settings.id;
    }

    const createdSettings = await this.prismaService.gptSettings.upsert({
      where: {
        id: newSettings.id ?? 1,
      },
      update: newSettings,
      create: newSettings,
    });

    return createdSettings;
  }

  async generateQuestions(params: { level: ESKILL_LEVEL; techs?: number[] }, userId?: number, isAdmin?: boolean) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    let settings = this.getDefaultSettings();

    const savedSettings: IGptSettings = await this.getSettings();

    if (savedSettings) {
      settings = savedSettings;
    }

    let questionsAmount = isAdmin ? settings.admin_amount : settings.user_amount;
    let questions = [];
    let passedQuestions = [];
    if (userId) {
      passedQuestions = await this.questionService.getPassedQuestionsByUser(params.level, userId, params.techs);
    }

    const questionsFromDatabase = isAdmin
      ? []
      : await this.questionService.getNonPassedQuestions(params.level, questionsAmount, userId, params.techs);

    if (questionsFromDatabase.length >= questionsAmount) {
      return {
        response: { questions: questionsFromDatabase.slice(0, questionsAmount) },
        usage: null,
      };
    } else {
      questionsAmount -= questionsFromDatabase.length;
      questions = [...questionsFromDatabase];
    }

    const questionTechs = await this.questionService.getTechsById(params.techs);

    const replaceData = {
      $PASSED_QUESTIONS: passedQuestions.map((question) => question.question).join(', '),
      $QUESTIONS_AMOUNT: isAdmin ? settings.admin_amount : settings.user_amount,
      $SKILL_LEVEL: getSkillLevel(params.level),
      $QUESTION_TECHS: questionTechs.map((el) => `${el.name} (${el.description})`).join(', '),
    };

    const openai = new OpenAI({ apiKey: apiKey });
    const completion: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
      model: isAdmin ? settings.admin_model : settings.user_model,
      store: true,
      messages: [
        {
          role: 'system',
          content: replacePromptKeywords(settings.system_message, replaceData),
        },
        {
          role: 'user',
          content: replacePromptKeywords(settings.user_message, replaceData),
        },
      ],
      response_format: zodResponseFormat(GPTResponse, 'event'),
      temperature: settings.temperature,
    });

    return {
      response: {
        questions: [...questions, ...JSON.parse(completion.choices[0].message.content).questions],
      },
      usage: completion.usage,
    };
  }

  getStream(): Observable<IGPTStreamMessageEvent> {
    return this.stream$.asObservable();
  }

  async handleMessage(content: string) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    const openai = new OpenAI({ apiKey: apiKey });
    const completion: Stream<OpenAI.Chat.Completions.ChatCompletionChunk> = await openai.chat.completions.create({
      model: 'gpt-4o',
      store: true,
      messages: [
        {
          role: 'system',
          content:
            'Ты часть сервиса по подготовке к собеседованиям. Твоя задача провести собеседование с потенциальным кандидатом, задавать ему вопросы, которые были бы заданы на реальном собеседовании и в конце дать оценку его знаниям',
        },
        {
          role: 'user',
          content: 'Меня зовут Денис, я начинающий frontend разработчик ' + content,
        },
      ],
      temperature: 1,
      stream: true,
    });

    let fullResponse = '';

    for await (const chunk of completion) {
      const delta = chunk.choices?.[0]?.delta;
      const contentPart = delta?.content;

      if (contentPart) {
        fullResponse += contentPart;

        this.stream$.next({
          name: 'chunk',
          data: {
            text: contentPart,
            type: 'chunk',
          },
        });
      }
    }
    this.stream$.next({
      name: 'done',
      data: {
        text: '',
        type: 'done',
      },
    });

    console.log('Save to BD: ' + fullResponse);
  }
}
