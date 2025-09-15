import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ETASKS_STATUS } from '@prisma/client';
import { GptService } from '@/gpt/gpt.service';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SystemTasksService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly gptService: GptService
  ) {}

  async getAllTasks() {
    return this.prismaService.task.findMany();
  }

  async getTaskById(id: string) {
    return this.prismaService.task.findUnique({
      where: {
        id,
      },
    });
  }

  async createNewTask(data: { title: string; content: string }, userId: number) {
    const newTask = await this.prismaService.task.create({
      data: {
        title: data.title,
        content: data.content,
        created_by: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return newTask;
  }

  async deleteTaskById(id: string) {
    return this.prismaService.task.delete({
      where: {
        id,
      },
    });
  }

  async updateTask(id: string, data: { title?: string; content?: string; status?: ETASKS_STATUS }) {
    const task = this.prismaService.task.findUnique({
      where: {
        id,
      },
    });

    if (!task) {
      throw new HttpException({ message: `Задача с id ${id} не найдена.`, info: { type: 'task' } }, HttpStatus.BAD_REQUEST);
    }

    return await this.prismaService.task.update({
      where: {
        id,
      },
      data: {
        title: data.title,
        content: data.content,
        status: data.status,
      },
    });
  }

  async generateTaskFromGpt() {
    try {
      console.log('mi v generate');

      const currentTasks = await this.prismaService.task.findMany({
        where: {
          status: ETASKS_STATUS.TODO,
        },
      });

      console.log('currentTasks', currentTasks);

      const gptGeneratedTasks = await this.gptService.generateGptRecomendations(currentTasks);
      console.log('gptGeneratedTasks received:', !!gptGeneratedTasks);

      return gptGeneratedTasks;
    } catch (error) {
      console.error('Error in generateTaskFromGpt:', error);
      throw error;
    }
  }
}
