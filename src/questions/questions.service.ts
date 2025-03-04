import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IQuestion } from '../utils/interfaces/questions';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveQuestion(question: IQuestion, userId: number) {
    const newQuestion = await this.prisma.question.create({
      data: {
        question: question.question,
        type: question.type,
        level: question.level,
        saved_by: { connect: { id: userId } },
        responses: {
          create: question.responses,
        },
      },
    });

    const progress = await this.prisma.userQuestionProgress.create({
      data: {
        user_id: newQuestion.saved_by_id,
        question_id: newQuestion.id,
        passed_at: new Date(),
      },
    });

    return {
      user_id: progress.user_id,
      question_id: progress.question_id,
      passed_at: progress.passed_at,
    };
  }

  async getNonPassedQuestions(level: number, type: number, amount: number, userId?: number) {
    const unansweredQuestions = await this.prisma.question.findMany({
      take: amount,
      where: {
        ...(userId
          ? {
              NOT: {
                users: {
                  some: {
                    user_id: userId, // пользователь не прошел этот вопрос
                  },
                },
              },
            }
          : {}),
        level: { equals: level },
        type: { equals: type },
      },
      select: {
        id: true,
        question: true,
        saved_by_id: true,
        level: true,
        type: true,
        responses: true,
      },
    });

    return unansweredQuestions;
  }
}
