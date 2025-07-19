import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IFile } from '../utils/interfaces/files';

interface IInterviewFile extends IFile {
  inside_type: 'cv' | 'vac';
}

@Injectable()
export class InterviewService {
  constructor(private readonly prismaService: PrismaService) {}

  async getInterviewById(interviewId: string) {
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
        files: true,
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

  async updateInterviewFiles(files: IInterviewFile[], interviewId: string, userId: number) {
    const updatedInterview = await this.prismaService.interview.update({
      where: {
        id: interviewId,
      },
      data: {
        files: {
          create: files.map((file) => ({
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            public: file.public,
            entity_id: String(file.entity_id),
            entity_type: 'interview',
            user: {
              connect: {
                id: userId,
              },
            },
            inside_type: file.inside_type,
          })),
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
        files: true,
      },
    });

    return updatedInterview;
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
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        user_prompt: true,
        messages: true,
        finished: true,
        recomendations: true,
        user_id: true,
        files: true,
      },
    });

    return updatedInterview;
  }

  async finishInterview(interviewId: string, json: string) {
    const result = JSON.parse(json) as { status: string; score: string; summary: string };

    const updatedInterview = await this.prismaService.interview.update({
      where: {
        id: interviewId,
      },
      data: {
        finished: true,
        recomendations: result.summary,
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
        files: true,
      },
    });

    return updatedInterview;
  }

  async getAllUserInterviews(userId: number) {
    const result = await this.prismaService.interview.findMany({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        user_prompt: true,
        finished: true,
        user_id: true,
        files: {
          select: {
            filename: true,
            mimetype: true,
            size: true,
            path: true,
            public: true,
            user_id: true,
            entity_type: true,
            entity_id: true,
          },
        },
      },
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
