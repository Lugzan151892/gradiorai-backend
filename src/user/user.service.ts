import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
        isGoogle: true,
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

  async setUserName(id: number, username: string) {
    if (username.length > 20) {
      throw new HttpException(
        { message: `Имя ${username} должно быть не более 20 символов`, info: { type: 'username' } },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!username.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new HttpException(
        { message: `Имя может содержать только латинские буквы, цифры тире или подчеркивание`, info: { type: 'username' } },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!username.match(/[a-zA-Z0-9]/)) {
      throw new HttpException(
        { message: `Имя должно содержать хотя бы 1 латинскую букву или цифру`, info: { type: 'username' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new HttpException({ message: `Пользователь с id ${id} не найден.`, info: { type: 'user' } }, HttpStatus.BAD_REQUEST);
    }

    const existing = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new HttpException(
        { message: `Пользователь с именем ${username} уже существует.`, info: { type: 'user' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        username,
      },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    return updatedUser;
  }

  async deleteUser(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
