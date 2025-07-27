import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createNewReview(data: { comment?: string; rating?: number }, userId?: number, ip?: string) {
    const reviewData: {
      text: string;
      rating: number | null;
      saved_by?: { connect: { id: number } };
      ip?: string;
    } = {
      text: data.comment || '',
      rating: data.rating ?? null,
    };

    if (userId) {
      reviewData.saved_by = { connect: { id: userId } };
    } else if (ip) {
      reviewData.ip = ip;
    }

    const result = await this.prisma.reviews.create({
      data: reviewData,
      select: {
        id: true,
      },
    });

    return result;
  }

  async getUsers(onlyAdmins: boolean) {
    const result = await this.prisma.user.findMany({
      ...(onlyAdmins
        ? {
            where: {
              admin: true,
            },
          }
        : {}),
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
            createdAt: 'desc',
          },
        },
        questions_passed: true,
        admin: true,
      },
    });

    return result;
  }

  async getAllReviews() {
    const result = await this.prisma.reviews.findMany({
      select: {
        id: true,
        created_at: true,
        text: true,
        rating: true,
        checked: true,
        saved_by: {
          select: {
            id: true,
            email: true,
            admin: true,
          },
        },
        ip: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return result;
  }
}
