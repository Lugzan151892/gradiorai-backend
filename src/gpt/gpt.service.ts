import { forwardRef, Inject, Injectable } from '@nestjs/common';
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
import { IGPTStreamMessageEvent, IInterview } from '../utils/interfaces/gpt/interfaces';
import { InterviewService } from '../interview/interview.service';

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
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => InterviewService))
    private readonly interviewService: InterviewService
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

  async handleMessage(interview: IInterview) {
    const apiKey = this.configService.get<string>('CHAT_SECRET');
    const openai = new OpenAI({ apiKey: apiKey });

    const messages = interview.messages
      .map((message, iMessage) => {
        if (message.is_human) {
          return `Сообщение №${iMessage}. Пользователь: ${message.text}.`;
        }

        return `Сообщение №${iMessage}. Твое сообщение: ${message.text}.`;
      })
      .slice(0, -1);

    const completion: Stream<OpenAI.Chat.Completions.ChatCompletionChunk> = await openai.chat.completions.create({
      model: 'gpt-4.1',
      store: true,
      messages: [
        {
          role: 'system',
          content:
            'Ты часть сервиса по подготовке к собеседованиям. Твоя задача провести собеседование с потенциальным кандидатом, задавать ему вопросы, которые были бы заданы на реальном собеседовании и в конце дать оценку его знаниям. Если нет истории сообщений и по сообщению пользователя нельзя понять, в каком направлении он хочет пройти собеседование, спрашивай его уточняющие вопросы, пока не поймешь, какой тип собеседования ему нужен. Не задавай несколько вопросов в одном сообщении, максимум 1-2 вопроса, подходящих по смыслу. Не спрашивай сам, что еще хотел бы обсудить пользователь. Веди собеседование самостоятельно и сам направляй пользователя в нужном направлении. Если пользователь не ответил на твой вопрос или ответил неправильно, сначала задай наводящий вопрос и если пользователь не может ответить, тогда ответь сам, посоветуй что почитать, чтобы улучшить его навыки в конце ответа спроси все ли он понял и можно ли продолжать собеседование. Если есть история сообщений, веди себя так, как будто вы уже общались, не здоровайся второй раз, просто продолжай диалог. ' +
            (messages.length
              ? `Вот ваша история сообщений по порядку, продолжай общение либо завершай интервью, если считаешь, что оно окончено: [Начало истории сообщений] ${messages.join(', ')} [Конец истории сообщений]`
              : '') +
            ` Когда ты решишь, что собеседование завершено или если пользователь написал "Закончить собеседование" или "Покажи результат", выдай итоговую оценку. ⚠️ Важно: итоговая оценка должна быть выведена одним сообщением и начинаться с секретного символа [R]. Нигде больше не использую этот символ, кроме итогового сообщения. Символ [R] верни в первом же чанке, не разделяй его. Итоговое сообщение дай в таком формате:
            [R]{"status":"done", "score":"8/10", "summary":"Описание того как прошло интервью и какие навыки необходимо подтянуть пользователю."}
            Не добавляй пояснений до или после.`,
        },
        {
          role: 'user',
          content:
            interview.messages.length && interview.messages[interview.messages.length - 1].is_human
              ? interview.messages[interview.messages.length - 1].text
              : interview.user_prompt,
        },
      ],
      temperature: 1,
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

      this.stream$.next({
        name: 'data',
        data: {
          type: 'result',
          interview: finishedInterview,
        },
      });
    }

    console.log('Save to BD: ' + fullResponse);
  }
}
