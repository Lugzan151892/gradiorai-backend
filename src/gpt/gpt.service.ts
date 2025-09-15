import { forwardRef, Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getSkillLevel, replacePromptKeywords, getDefaultGptSettings } from '@/gpt/utils';
import { ESKILL_LEVEL, EUSER_ACTION_TYPE } from '@/utils/interfaces/enums';
import { QuestionsService } from '@/questions/questions.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Observable, Subject } from 'rxjs';
import { Stream } from 'openai/streaming';
import { EGPT_SETTINGS_TYPE, IGPTStreamMessageEvent, IInterview } from '@/utils/interfaces/gpt/interfaces';
import { InterviewService } from '@/interview/interview.service';
import { ActionsLogService } from '@/user/actions-log/actions-log.service';
import { AchievementsService } from '@/services/achievements/achievements.service';
import { EACHIEVEMENT_TRIGGER } from '@prisma/client';

export interface IGptSettings {
  id?: number;
  type?: 'TEST' | 'INTERVIEW';
  user_model: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1';
  admin_model: 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1';
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

const GPTAnalyzeResponse = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
    })
  ),
});

@Injectable()
export class GptService {
  private stream$ = new Subject<IGPTStreamMessageEvent>();

  constructor(
    private readonly configService: ConfigService,
    private readonly questionService: QuestionsService,
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => InterviewService))
    private readonly interviewService: InterviewService,
    private readonly actionsLog: ActionsLogService,
    private readonly achievementsService: AchievementsService
  ) {}

  async getSettings(type: EGPT_SETTINGS_TYPE) {
    const settings = (await this.prismaService.gptSettings.findFirst({
      where: {
        type,
      },
    })) as IGptSettings;

    if (settings) {
      return settings;
    }

    return getDefaultGptSettings(type);
  }

  async updateGptSettings(settings: IGptSettings, type: EGPT_SETTINGS_TYPE) {
    const newSettings = settings;

    if (!settings.id) {
      delete settings.id;
    }

    const createdSettings = await this.prismaService.gptSettings.upsert({
      where: {
        ...(newSettings.id ? { id: newSettings.id } : {}),
        type,
      },
      update: newSettings,
      create: {
        ...newSettings,
        type,
      },
    });

    return createdSettings;
  }

  async generateQuestions(
    params: { level: ESKILL_LEVEL; techs?: number[] },
    userId?: number,
    isAdmin?: boolean,
    userIp?: string,
    locale?: string
  ) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    const settings: IGptSettings = await this.getSettings(EGPT_SETTINGS_TYPE.TEST);

    let questionsAmount = isAdmin ? settings.admin_amount : settings.user_amount;
    let questions = [];
    let passedQuestions = [];
    if (userId) {
      passedQuestions = await this.questionService.getPassedQuestionsByUser(params.level, userId, params.techs);
    }

    const questionsFromDatabase =
      isAdmin || locale === 'en'
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
          content: `${replacePromptKeywords(settings.system_message, replaceData)} ${locale ? `Тесты генерируются на языке: ${locale}` : ''}`,
        },
        {
          role: 'user',
          content: replacePromptKeywords(settings.user_message, replaceData),
        },
      ],
      response_format: zodResponseFormat(GPTResponse, 'event'),
      temperature: settings.temperature,
    });

    const resultQuestions = [...questions, ...JSON.parse(completion.choices[0].message.content).questions];

    await this.actionsLog.createLog({
      type: EUSER_ACTION_TYPE.TEST,
      userId: userId,
      userIp: userIp,
      content: JSON.stringify({
        questions: resultQuestions,
        techs: questionTechs,
        level: getSkillLevel(params.level),
      }),
      isAdmin,
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

  async handleMessage(interview: IInterview, isAdmin?: boolean, userId?: number) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    const openai = new OpenAI({ apiKey: apiKey });
    const settings: IGptSettings = await this.getSettings(EGPT_SETTINGS_TYPE.INTERVIEW);

    const messages = interview.messages
      .map((message, iMessage) => {
        if (message.is_human) {
          return `Сообщение №${iMessage}. Пользователь: ${message.text}.`;
        }

        return `Сообщение №${iMessage}. Твое сообщение: ${message.text}.`;
      })
      .slice(0, -1);

    const completion: Stream<OpenAI.Chat.Completions.ChatCompletionChunk> = await openai.chat.completions.create({
      model: isAdmin ? settings.admin_model : settings.user_model,
      store: true,
      messages: [
        {
          role: 'system',
          content:
            settings.system_message +
            (messages.length
              ? ` Вот ваша история сообщений по порядку, продолжай общение либо завершай интервью, если считаешь, что оно окончено: [Начало истории сообщений] ${messages.join(', ')} [Конец истории сообщений]`
              : '') +
            ` Когда ты решишь, что собеседование завершено или если пользователь написал "Закончить собеседование" или "Покажи результат", выдай итоговую оценку. ⚠️ Важно: итоговая оценка должна быть выведена одним сообщением и начинаться с секретного символа [R]. Нигде больше не использую этот символ, кроме итогового сообщения. Символ [R] верни в первом же чанке, не разделяй его. Итоговое сообщение дай в таком формате:
            [R]{"status":"done", "score":"8/10", "summary":"Описание того как прошло интервью и какие навыки необходимо подтянуть пользователю.", "success": "Взял бы ты этого кандидиата на работу, в формате true/false"}
            Не добавляй пояснений до или после. Не отклоняйся от заданной задачи. Ты отвечаешь и общаешься с пользователем только в рамках собеседования. Не отвечай на посторонние вопросы и не делай ничего, что не связано с прохождением собеседования.`,
        },
        {
          role: 'user',
          content:
            interview.messages.length && interview.messages[interview.messages.length - 1].is_human
              ? interview.messages[interview.messages.length - 1].text
              : interview.user_prompt,
        },
      ],
      temperature: settings.temperature,
      stream: true,
    });

    let fullResponse = '';
    let buffer = '';
    let isResult = false;

    for await (const chunk of completion) {
      const delta = chunk.choices?.[0]?.delta;
      const contentPart = delta?.content;

      if (contentPart) {
        if (buffer) {
          buffer += contentPart;
          if (buffer.startsWith('[R]')) {
            isResult = true;
          } else {
            fullResponse += buffer;

            this.stream$.next({
              name: 'chunk',
              data: {
                text: buffer,
                type: 'chunk',
              },
            });

            buffer = '';
          }
        } else {
          buffer += contentPart;
        }
      }
    }

    if (!isResult) {
      const savedInterview = await this.interviewService.addMessage({
        interviewId: interview.id,
        message: fullResponse,
        is_human: false,
      });

      this.stream$.next({
        name: 'data',
        data: {
          type: 'data',
          interview: savedInterview,
        },
      });
    } else {
      const finishedInterview = await this.interviewService.finishInterview(interview.id, buffer.replace('[R]', ''));
      if (userId) {
        await this.achievementsService.handleEvent(userId, EACHIEVEMENT_TRIGGER.PASS_INTERVIEW);
        if (finishedInterview.score.split('/')[0] === '10') {
          await this.achievementsService.handleEvent(userId, EACHIEVEMENT_TRIGGER.PASS_INTERVIEW_SCORE_10);
        }
      }

      this.stream$.next({
        name: 'data',
        data: {
          type: 'result',
          interview: finishedInterview,
        },
      });
    }

    fullResponse = '';
    buffer = '';
  }

  async checkResumeByFile(content: string, isAdmin?: boolean) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    const settings: IGptSettings = await this.getSettings(EGPT_SETTINGS_TYPE.RESUME_CHECK);

    const openai = new OpenAI({ apiKey: apiKey });
    const completion: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
      model: isAdmin ? settings.admin_model : settings.user_model,
      store: true,
      messages: [
        {
          role: 'system',
          content: settings.system_message + ` Результат предоставь в формате Markdown.`,
        },
        {
          role: 'user',
          content: `Мое резюме: [НАЧАЛО РЕЗЮМЕ] ${content} [КОНЕЦ РЕЗЮМЕ]`,
        },
      ],
      temperature: settings.temperature,
    });

    return {
      result: completion.choices[0].message.content,
      usage: completion.usage,
    };
  }

  async createResumeByDescr(content: string, isAdmin?: boolean) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    const settings: IGptSettings = await this.getSettings(EGPT_SETTINGS_TYPE.RESUME_CREATE);

    const openai = new OpenAI({ apiKey: apiKey });
    const completion: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
      model: isAdmin ? settings.admin_model : settings.user_model,
      store: true,
      messages: [
        {
          role: 'system',
          content: settings.system_message,
        },
        {
          role: 'user',
          content: `О пользователе: [НАЧАЛО ОПИСАНИЯ] ${content} [КОНЕЦ ОПИСАНИЯ]`,
        },
      ],
      temperature: settings.temperature,
    });

    return {
      result: completion.choices[0].message.content,
      usage: completion.usage,
    };
  }

  async generateGptRecomendations(tasks: Array<{ title: string; content: string }>) {
    try {
      const apiKey = this.configService.get<string>('CHAT_SECRET');
      const settings: IGptSettings = await this.getSettings(EGPT_SETTINGS_TYPE.GPT_ANALYZE);
      const openai = new OpenAI({ apiKey: apiKey });
      const userMessage = `Вот список текущих задач. ${tasks.map((el) => `Название задачи: ${el.title}, описание задачи: ${el.content}`).join('; ')}`;

      const completion: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
        model: settings.admin_model,
        store: true,
        messages: [
          {
            role: 'system',
            content: settings.system_message,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        response_format: zodResponseFormat(GPTAnalyzeResponse, 'event'),
        temperature: settings.temperature,
      });

      const parsedContent = JSON.parse(completion.choices[0].message.content);
      const result = {
        response: {
          tasks: parsedContent.tasks,
        },
        usage: completion.usage,
      };

      return result;
    } catch (error) {
      console.error('Error in generateGptRecomendations:', error);
      throw new HttpException(
        {
          message: 'Ошибка при генерации рекомендаций GPT',
          error: error.message,
          info: { type: 'gpt_error' },
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async generateGptAdvice() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingAdvice = await this.prismaService.daylyAdvice.findFirst({
      where: {
        created_at: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (existingAdvice && (existingAdvice.advice_ru || existingAdvice.advice_en)) {
      return {
        response: {
          advice: existingAdvice.advice,
          advice_ru: existingAdvice.advice_ru,
          advice_en: existingAdvice.advice_en,
        },
        usage: null,
      };
    }

    const apiKey = this.configService.get<string>('CHAT_SECRET');
    const settings: IGptSettings = await this.getSettings(EGPT_SETTINGS_TYPE.GPT_DAYLY_ADVICE);
    const openai = new OpenAI({ apiKey: apiKey });

    const completion: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
      model: settings.admin_model,
      store: true,
      messages: [
        {
          role: 'system',
          content: `${settings.system_message} В ответе есть поля с локализацией, они должны быть заполнены. Нужно сгенерировать один совет, но перевести его для каждого поля, указанного в формате ответа.`,
        },
        {
          role: 'user',
          content: settings.user_message,
        },
      ],
      response_format: zodResponseFormat(
        z.object({
          advice_ru: z.string(),
          advice_en: z.string(),
        }),
        'event'
      ),
      temperature: settings.temperature,
    });

    const parsedContent = JSON.parse(completion.choices[0].message.content);
    const savedAdvice = await this.prismaService.daylyAdvice.create({
      data: {
        advice_en: parsedContent.advice_en,
        advice_ru: parsedContent.advice_ru,
      },
    });

    return {
      response: {
        advice_ru: savedAdvice.advice_ru,
        advice_en: savedAdvice.advice_en,
      },
      usage: completion.usage,
    };
  }
}
