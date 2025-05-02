import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IQuestion } from '../utils/interfaces/questions';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveQuestion(question: IQuestion, userId: number) {
    const result = {
      user_id: 0,
      questions_id: [],
      passed_at: [],
    };

    question.level.forEach(async (level) => {
      const newQuestion = await this.prisma.question.create({
        data: {
          question: question.question,
          level: level,
          saved_by: { connect: { id: userId } },
          responses: {
            create: question.responses.map((response) => ({
              answer: response.answer,
              correct: response.correct,
            })),
          },
          ...(question.techs?.length
            ? {
                technologies: {
                  connect: question.techs.map((id) => ({ id })),
                },
              }
            : {}),
        },
      });

      const progress = await this.prisma.userQuestionProgress.create({
        data: {
          user_id: newQuestion.saved_by_id,
          question_id: newQuestion.id,
          passed_at: new Date(),
        },
      });

      result.passed_at.push(progress.passed_at);
      result.questions_id.push(progress.question_id);
      result.user_id = progress.user_id;
    });

    return result;
  }

  async editQuestions(question: Required<IQuestion>) {
    const isQuestionsExist = await this.prisma.question.findUnique({
      where: {
        id: question.id,
      },
    });

    if (!isQuestionsExist) {
      throw new HttpException(`Question with id ${question.id} not found`, HttpStatus.BAD_REQUEST);
    }

    await this.prisma.response.deleteMany({
      where: { question_id: question.id },
    });

    const updatedQuestion = await this.prisma.question.update({
      where: {
        id: question.id,
      },
      data: {
        question: question.question,
        ...(question.level.length ? { level: question.level[0] } : {}),
        responses: {
          create: question.responses.map((r) => ({
            answer: r.answer,
            correct: r.correct,
          })),
        },
        ...(question.techs?.length
          ? {
              technologies: {
                set: question.techs.map((techId) => ({
                  id: techId,
                })),
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    return updatedQuestion;
  }

  async getNonPassedQuestions(level: number, amount: number, userId?: number, techs?: number[]) {
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
        ...(techs && techs.length
          ? {
              technologies: {
                some: {
                  id: { in: techs },
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        question: true,
        saved_by_id: true,
        level: true,
        responses: true,
      },
    });

    return unansweredQuestions;
  }

  async saveNewTech(body: { name: string; description?: string; specs?: Array<number> }) {
    const isTechExist = await this.prisma.technology.findUnique({
      where: {
        name: body.name,
      },
    });

    if (isTechExist) {
      throw new HttpException(`Technology with name ${body.name} already exist`, HttpStatus.BAD_REQUEST);
    }

    const createdTech = await this.prisma.technology.create({
      data: {
        name: body.name,
        description: body.description,
        ...(body.specs?.length
          ? {
              specialization: {
                connect: body.specs.map((id) => ({ id })),
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    return createdTech;
  }

  async editTech(body: { id: number; name?: string; description?: string; specs?: Array<number> }) {
    const isTechExist = await this.prisma.technology.findUnique({
      where: {
        id: body.id,
      },
    });

    if (!isTechExist) {
      throw new HttpException(`Technology with id ${body.id} not found`, HttpStatus.BAD_REQUEST);
    }

    const updatedTech = await this.prisma.technology.update({
      where: {
        id: body.id,
      },
      data: {
        name: body.name,
        description: body.description,
        ...(body.specs?.length
          ? {
              specialization: {
                set: body.specs.map((id) => ({ id })),
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    return updatedTech;
  }

  async getTechs(specs: Array<number>) {
    const techs = await this.prisma.technology.findMany({
      ...(specs && specs.length
        ? {
            where: {
              specialization: {
                some: {
                  id: { in: specs },
                },
              },
            },
          }
        : {}),
      select: {
        id: true,
        name: true,
        description: true,
        specialization: true,
        _count: {
          select: { questions: true },
        },
      },
    });

    const questionsAmount = await this.prisma.question.count();

    return {
      techs: techs,
      questions_amount: questionsAmount,
    };
  }

  async getTechsById(techs?: number[]) {
    if (!techs?.length) {
      return [];
    }

    const result = await this.prisma.technology.findMany({
      where: {
        id: { in: techs },
      },
    });

    return result;
  }

  async deleteTechById(techId: number) {
    if (!techId) {
      throw new HttpException('ID не указан', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.technology.delete({
      where: {
        id: techId,
      },
    });

    return { message: 'Технология успешно удалена.' };
  }

  async saveNewSpec(body: { name: string; techs?: Array<number> }) {
    const isSpecExist = await this.prisma.specialization.findUnique({
      where: {
        name: body.name,
      },
    });

    if (isSpecExist) {
      throw new HttpException(`Specialization with name ${body.name} already exist`, HttpStatus.BAD_REQUEST);
    }

    const createdSpec = await this.prisma.specialization.create({
      data: {
        name: body.name,
        ...(body.techs?.length
          ? {
              technology: {
                connect: body.techs.map((id) => ({ id })),
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    return createdSpec;
  }

  async editSpec(body: { id: number; name?: string; techs?: Array<number> }) {
    const isSpecExist = await this.prisma.specialization.findUnique({
      where: {
        id: body.id,
      },
    });

    if (!isSpecExist) {
      throw new HttpException(`Technology with id ${body.id} not found`, HttpStatus.BAD_REQUEST);
    }

    const updatedSpec = await this.prisma.specialization.update({
      where: {
        id: body.id,
      },
      data: {
        name: body.name,
        ...(body.techs?.length
          ? {
              technology: {
                set: body.techs.map((id) => ({ id })),
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    return updatedSpec;
  }

  async getAllSpecs() {
    const specs = await this.prisma.specialization.findMany({
      select: {
        id: true,
        name: true,
        technology: true,
      },
    });

    return specs;
  }

  async getSpecById(specId: number) {
    const result = await this.prisma.specialization.findMany({
      where: {
        id: specId,
      },
    });

    if (!result) {
      throw new HttpException(`Specialization with id ${specId} not found`, HttpStatus.BAD_REQUEST);
    }

    return result;
  }

  async deleteSpecById(specId: number) {
    if (!specId) {
      throw new HttpException('ID не указан', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.specialization.delete({
      where: {
        id: specId,
      },
    });

    return { message: 'Специализация успешно удалена.' };
  }

  async getPassedQuestionsByUser(level: number, userId: number, techs: number[]) {
    const passedQuestions = await this.prisma.question.findMany({
      where: {
        users: {
          some: {
            user_id: userId,
          },
        },
        level: { equals: level },
        ...(techs && techs.length
          ? {
              technologies: {
                some: {
                  id: { in: techs },
                },
              },
            }
          : {}),
      },
      select: {
        question: true,
      },
    });

    return passedQuestions;
  }

  async saveQuestionProgress(questionId, userId: number) {
    if (!questionId || !userId) {
      throw new HttpException('User or question not found', HttpStatus.BAD_REQUEST);
    }

    const existedQuestion = await this.prisma.question.findUnique({
      where: {
        id: questionId,
        users: {
          none: { user_id: userId },
        },
      },
    });

    if (!existedQuestion) {
      throw new HttpException('Question not found', HttpStatus.BAD_REQUEST);
    }

    const progress = await this.prisma.userQuestionProgress.create({
      data: {
        user_id: userId,
        question_id: existedQuestion.id,
        passed_at: new Date(),
      },
    });

    return {
      passed_at: progress.passed_at,
      question_id: progress.question_id,
      user_id: progress.user_id,
    };
  }

  async getQuestions(withoutTechs?: boolean, userId?: number) {
    const questions = await this.prisma.question.findMany({
      ...(userId || withoutTechs
        ? {
            where: {
              ...(userId ? { saved_by_id: userId } : {}),
              ...(withoutTechs
                ? {
                    technologies: {
                      none: {},
                    },
                  }
                : {}),
            },
          }
        : {}),
      select: {
        id: true,
        question: true,
        responses: true,
        saved_by: true,
        technologies: true,
        level: true,
      },
    });

    return questions;
  }

  async deleteQuestionById(questionId: number) {
    if (!questionId) {
      throw new HttpException('ID не указан', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.questionTechnology.deleteMany({
      where: {
        questionId,
      },
    });

    await this.prisma.userQuestionProgress.deleteMany({
      where: {
        question_id: questionId,
      },
    });

    await this.prisma.question.delete({
      where: {
        id: questionId,
      },
    });

    return { message: 'Вопрос успешно удален.' };
  }
}
