import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createNewReview(data: { comment?: string; rating?: number }, userId: number) {
    const result = await this.prisma.reviews.create({
      data: {
        text: data.comment || '',
        rating: data.rating || 0,
        saved_by: { connect: { id: userId } },
      },
      select: {
        text: true,
        rating: true,
        saved_by: {
          select: {
            id: true,
            admin: true,
            email: true,
            created_at: true,
          },
        },
      },
    });

    return result;
  }

  async getUsers() {
    const result = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        last_ip: true,
        last_login: true,
        ip_log: {
          take: 3,
          orderBy: {
            createdAt: 'desc', // по убыванию времени — последние сверху
          },
        },
        questions_passed: true,
        admin: true,
      },
    });

    return result;
  }
}
