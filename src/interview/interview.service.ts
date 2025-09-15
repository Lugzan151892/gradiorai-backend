import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { parsePeriodToDate } from '@/utils/date';
import { UserRatingService } from '@/user/rating/UserRatingService';
import { INTERVIEW_SELECT } from '@/utils/selectors/interview/interview';

@Injectable()
export class InterviewService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userRatingService: UserRatingService
  ) {}

  async getInterviewById(interviewId: string) {
    const result = await this.prismaService.interview.findUnique({
      where: {
        id: interviewId,
      },
      select: INTERVIEW_SELECT,
    });

    return result;
  }

  async createInterview(data: { userId: number; user_prompt: string }) {
    const interview = await this.prismaService.interview.create({
      data: {
        user_prompt: data.user_prompt,
        user: {
          connect: {
            id: data.userId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    return interview;
  }

  updateUserPromptByFiles(userPrompt: string, cvText: string, vacText?: string) {
    const newPrompt = `${userPrompt} Мое резюме в текстовом виде: [Начало резюме] ${cvText} [Конец резюме]. ${vacText ? `Вакансия, на которую я хочу попасть, в текстовом виде: [Начало вакансии] ${vacText} [Конец вакансии]` : ''}`;

    return newPrompt;
  }

  async addMessage(data: { interviewId: string; message: string; is_human: boolean }) {
    const updatedInterview = await this.prismaService.interview.update({
      where: {
        id: data.interviewId,
      },
      data: {
        messages: {
          create: {
            is_human: data.is_human,
            text: data.message,
          },
        },
      },
      select: INTERVIEW_SELECT,
    });

    return updatedInterview;
  }

  async finishInterview(interviewId: string, json: string) {
    const result = JSON.parse(json) as { status: string; score: string; summary: string; success: string };

    const updatedInterview = await this.prismaService.interview.update({
      where: {
        id: interviewId,
      },
      data: {
        finished: true,
        recomendations: result.summary,
        score: result.score,
        success: result.success === 'true',
      },
      select: INTERVIEW_SELECT,
    });

    await this.userRatingService.addInterviewResult(
      updatedInterview.user_id,
      Number(result.score.split('/')[0]),
      result.success === 'true'
    );

    return updatedInterview;
  }

  async getAllUserInterviews(userId: number, period?: string) {
    const where: {
      user_id: number;
      created_at?: {
        gte: Date;
      };
    } = {
      user_id: userId,
    };

    if (period) {
      const fromDate = parsePeriodToDate(period);
      where.created_at = { gte: fromDate };
    }

    const result = await this.prismaService.interview.findMany({
      where,
      select: INTERVIEW_SELECT,
      orderBy: {
        created_at: 'desc',
      },
    });

    return result;
  }

  async deleteInterview(interviewId: string) {
    if (!interviewId) {
      throw new HttpException('ID не указан', HttpStatus.BAD_REQUEST);
    }

    await this.prismaService.interview.delete({
      where: {
        id: interviewId,
      },
    });

    return { message: 'Интервью успешно удалено.' };
  }
}
