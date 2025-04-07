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
}
