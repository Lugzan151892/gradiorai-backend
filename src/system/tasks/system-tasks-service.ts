import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SystemTasksService {
  constructor(private readonly prismaService: PrismaService) {}

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
}
