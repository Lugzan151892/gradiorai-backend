import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IActionsLogData } from 'src/utils/interfaces/user';

@Injectable()
export class ActionsLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs() {
    const result = await this.prisma.userActionsLog.findMany({
      include: {
        user: true,
        interview: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return result;
  }

  async createLog(data: IActionsLogData) {
    const savedLog = await this.prisma.userActionsLog.create({
      data: {
        type: data.type,
        user_ip: data.userIp,
        ...(data.userId
          ? {
              user: {
                connect: {
                  id: data.userId,
                },
              },
            }
          : {}),
        ...(data.interviewId
          ? {
              interview: {
                connect: {
                  id: data.interviewId,
                },
              },
            }
          : {}),
        content: data.content,
        is_admin: data.isAdmin,
      },
    });

    return savedLog;
  }
}
