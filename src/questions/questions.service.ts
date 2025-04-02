import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IQuestion } from '../utils/interfaces/questions';
import { ETEST_SPEC } from 'src/utils/interfaces/enums';

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
                  createMany: {
                    data: question.techs.map((techId) => ({
                      technologyId: techId,
                    })),
                  },
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
                  technologyId: { in: techs },
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

    const existingRelations = await this.prisma.specializationTechnology.findMany({
      where: { technologyId: body.id },
      select: { specializationId: true },
    });

    const existingIds = new Set(existingRelations.map((rel) => rel.specializationId));
    const newIds = (body.specs || []).filter((id) => !existingIds.has(id));

    const updatedTech = await this.prisma.technology.update({
      where: {
        id: body.id,
      },
      data: {
        name: body.name,
        description: body.description,
        ...(newIds.length
          ? {
              specialization: {
                set: newIds.map((id) => ({ id })),
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

    const existingRelations = await this.prisma.specializationTechnology.findMany({
      where: { specializationId: body.id },
      select: { technologyId: true },
    });

    const existingIds = new Set(existingRelations.map((rel) => rel.technologyId));
    const newIds = (body.techs || []).filter((id) => !existingIds.has(id));

    const updatedSpec = await this.prisma.specialization.update({
      where: {
        id: body.id,
      },
      data: {
        name: body.name,
        ...(newIds.length
          ? {
              technology: {
                set: newIds.map((id) => ({ id })),
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (newIds.length > 0) {
      await this.prisma.specializationTechnology.createMany({
        data: newIds.map((technologyId) => ({
          technologyId,
          specializationId: updatedSpec.id,
        })),
      });
    }

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
                  technologyId: { in: techs },
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
}
