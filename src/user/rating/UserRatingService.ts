import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EUSER_ACTION_TYPE, EUSER_FILES_TYPE } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserRatingService {
  private readonly MIN_RATING = 1000;
  private readonly MAX_RATING = 3000;

  constructor(private prisma: PrismaService) {}

  /** коэффициент "замедления" прироста */
  private getK(current: number) {
    return Math.max(0, 1 - (current - this.MIN_RATING) / (this.MAX_RATING - this.MIN_RATING));
  }

  /** коэффициент замедления для рейтинга выше потолка */
  private getOverflowK(current: number) {
    if (current <= this.MAX_RATING) return 1;

    // Чем больше превышение, тем сильнее замедление
    const overflow = current - this.MAX_RATING;
    const maxOverflow = 1000; // максимальное превышение для расчета
    const overflowRatio = Math.min(overflow / maxOverflow, 1);

    // Коэффициент от 0.1 до 0.01 (очень медленный рост)
    return Math.max(0.01, 0.1 * (1 - overflowRatio));
  }

  private async updateUserRating(userId: number, source: EUSER_ACTION_TYPE, delta: number, comment: string) {
    const userRating = await this.prisma.userRating.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
    });

    let oldValue: number;
    let newValue: number;

    if (source === EUSER_ACTION_TYPE.TEST) {
      oldValue = userRating.tests_rating;
      newValue = Math.max(this.MIN_RATING, oldValue + delta);
      await this.prisma.userRating.update({
        where: { user_id: userId },
        data: {
          tests_rating: newValue,
          total_rating: newValue + userRating.interviews_rating,
          last_activity: new Date(),
        },
      });
    } else if (source === EUSER_ACTION_TYPE.INTERVIEW) {
      oldValue = userRating.interviews_rating;
      newValue = Math.max(this.MIN_RATING, oldValue + delta);
      await this.prisma.userRating.update({
        where: { user_id: userId },
        data: {
          interviews_rating: newValue,
          total_rating: newValue + userRating.tests_rating,
          last_activity: new Date(),
        },
      });
    }

    await this.prisma.userRatingLog.create({
      data: {
        user_id: userId,
        source,
        delta,
        old_value: oldValue,
        new_value: newValue,
        comment,
      },
    });
  }

  async addInterviewResult(userId: number, score: number, success: boolean) {
    const userRating = await this.prisma.userRating.findUnique({ where: { user_id: userId } });
    const current = userRating?.interviews_rating ?? this.MIN_RATING;

    let base = (score / 10) * 100;
    let bonus = success ? 50 : -50;
    let gain = base + bonus;

    let delta: number;

    if (current >= this.MAX_RATING) {
      // Если перевалил потолок, используем коэффициент замедления
      const overflowK = this.getOverflowK(current);
      delta = Math.round(gain * overflowK);
    } else {
      // Обычный расчет с замедлением по мере приближения к потолку
      const K = this.getK(current);
      delta = Math.round(gain * K);
    }

    await this.updateUserRating(userId, EUSER_ACTION_TYPE.INTERVIEW, delta, `Interview: score=${score}, success=${success}`);
  }

  async addTestResult(userId: number, level: number, questions: number, correct: number) {
    const userRating = await this.prisma.userRating.findUnique({ where: { user_id: userId } });
    const current = userRating?.tests_rating ?? this.MIN_RATING;

    const percent = correct / questions;
    let base = percent * 100 * level * (questions / 10);

    let delta: number;

    if (current >= this.MAX_RATING) {
      // Если перевалил потолок, используем коэффициент замедления
      const overflowK = this.getOverflowK(current);
      delta = Math.round(base * overflowK);
    } else {
      // Обычный расчет с замедлением по мере приближения к потолку
      const K = this.getK(current);
      delta = Math.round(base * K);
    }

    await this.updateUserRating(
      userId,
      EUSER_ACTION_TYPE.TEST,
      delta,
      `Test: level=${level}, q=${questions}, correct=${correct}`
    );
  }

  async getUsersRating() {
    const users = await this.prisma.userRating.findMany({
      orderBy: { total_rating: 'desc' },
      take: 10,
      select: {
        id: true,
        tests_rating: true,
        interviews_rating: true,
        total_rating: true,
        last_activity: true,
        updated_at: true,
        created_at: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            files: {
              where: {
                type: EUSER_FILES_TYPE.AVATAR,
              },
            },
          },
        },
      },
    });

    return users;
  }

  async getFakeUser(id: string) {
    return await this.prisma.fakeUser.findUnique({ where: { id } });
  }

  async getFakeUsers() {
    return await this.prisma.fakeUser.findMany();
  }

  async createFakeUser(name: string, total_rating: number) {
    const existingUser = await this.prisma.fakeUser.findFirst({ where: { name } });
    if (existingUser) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    return await this.prisma.fakeUser.create({
      data: {
        name,
        total_rating,
      },
    });
  }

  async editFakeUser(id: string, name?: string, total_rating?: number) {
    const existingUser = await this.prisma.fakeUser.findUnique({ where: { id } });
    if (!existingUser) {
      throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
    }

    return await this.prisma.fakeUser.update({
      where: { id },
      data: { name, total_rating },
    });
  }

  async deleteFakeUser(id: string) {
    const existingUser = await this.prisma.fakeUser.findUnique({ where: { id } });
    if (!existingUser) {
      throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
    }

    return await this.prisma.fakeUser.delete({ where: { id } });
  }
}
