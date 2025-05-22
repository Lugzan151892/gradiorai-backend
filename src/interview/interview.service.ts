import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InterviewService {
  constructor(private readonly prismaService: PrismaService) {}

  async getInterviewById(interviewId) {
    const result = await this.prismaService.interview.findUnique({
      where: {
        id: interviewId,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        user_prompt: true,
        messages: true,
        finished: true,
        recomendations: true,
        user_id: true,
      },
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
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        user_prompt: true,
        messages: true,
        finished: true,
        recomendations: true,
        user_id: true,
      },
    });

    return updatedInterview;
  }
}
