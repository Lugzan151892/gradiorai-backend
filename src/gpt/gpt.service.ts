import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getSkillLevel, getSpecText } from './utils';
import { ESKILL_LEVEL, ETEST_SPEC } from '../utils/interfaces/enums';
import { QuestionsService } from 'src/questions/questions.service';
import mockedQuestions from '../utils/mocked/mockedQuestions';

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
    let passedQuestions = [];
    if (userId) {
      passedQuestions = await this.questionService.getPassedQuestionsByUser(params.level, params.spec, userId);
    }
    if (!isAdmin) {
      const questionsFromDatabase = await this.questionService.getNonPassedQuestions(
        params.level,
        params.spec,
        questionsAmount,
        userId,
        params.techs
      );

      if (questionsFromDatabase.length >= questionsAmount) {
        return {
          response: questionsFromDatabase.slice(0, questionsAmount),
          usage: null,
        };
      } else {
        questionsAmount -= questionsFromDatabase.length;
        questions = [...questionsFromDatabase];
      }
    }

    const questionTechs = await this.questionService.getTechsById(params.techs);

    const openai = new OpenAI({ apiKey: apiKey });
    const completion: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      store: true,
      messages: [
        {
          role: 'system',
          content: `
          Ты - часть сервиса по генерации вопроса к собеседованиям на it специальности. Анализируй запрос как опытный сеньор разработчик с большим опытом проведения технических собеседований в той области, в которой тебя просят сгенерировать данные. Твоя задача генерировать разнообразные и интересные вопросы, чтобы пользователям любого уровня было интересно их проходить и в то же время они учились чему то новому проходя их. Вопросы нужно генерировать в соответствии с направлением и технологиями, которые тебе передают в вопросе. Например в вопросах для фронтенд разработчика не должно быть вопросов про базы данных или утечку памяти, он с этим не работает и не обязан это знать. Вопросы должны соответствовать уровню тестируемого. Пример хорошего вопроса для миддл - сеньор фронтенд разработчика: На чем основана реактивность во vue 3 и чем она отличается от реактивности на vue 2. Этот вопрос составлен хорошо, потому что: Он подходит по уровню собеседуемого - они должны более глубоко знать основы технологии с которой работают. Вопрос сформулирован прямо, на него можно дать только один правильный вариант ответа. Вопрос проверяет углубленные знания тестируемого, понимает ли он как работают технологии, которые он должен знать. В то же время этот вопрос плох для Джуниор разработчика. От него требуется знания основ языка программирования и основной синтаксис и умение реализовывать компоненты на своем фреймворке. Знание того, как работает фреймворк «под капотом» ему не пригодятся в реальной работе. Вот пример хороших вопросов для Джуниор фронтенд разработчика: Что вернет функция с пустым return? Или как можно проверить тип возвращаемых функцией данных? Эти вопросы хороши для Джуниор уровня, потому что они проверяют знание базы языка программирования с которым он работает. В то же время для миддл разработчику можно задать эти вопросы, но подразумевается, что он итак это знает и это не даст никакого результата. Для сеньор разработчика, он и так это знает, эти вопросы будут скучными и он их пропустит. Пример хороших вопросов для QA ${JSON.stringify(mockedQuestions)}. ${passedQuestions.length ? `Пользователь уже прошел эти вопросы: ${passedQuestions.map((question) => question.question).join(', ')}. Это тоже пример хороших вопросов.` : ''} Твои вопросы не должны повторять вопросы из примеров. Варианты ответов должны быть реалистичными и не слишком очевидными, чтобы проверить глубину знаний. Используй реальные кейсы. Пожалуйста, генерируй список вопросов с ответами, где для каждого ответа поле "id" должно быть целым числом больше 0. Вопросы и ответы генерируй на русском языке.`,
        },
        {
          role: 'user',
          content: `Сгенерируй ${questionsAmount} вопросов для собеседования на должность ${getSkillLevel(params.level)} ${getSpecText(params.spec)} с 4 вариантами ответа. ${questionTechs.length ? `Вопросы должны касаться следующих технологий: ${questionTechs.map((el) => el.name).join(', ')}.` : ''} Должен быть один правильный ответ и 3 неправильных.`,
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
