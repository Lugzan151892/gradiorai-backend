import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EUSER_ACTION_TYPE } from '@prisma/client';

@Injectable()
export class RatingService {
  private readonly MIN_RATING = 1000;
  private readonly MAX_RATING = 3000;

  constructor(private prisma: PrismaService) {}

  // коэффициент "замедления" прироста
  private getK(current: number) {
    return Math.max(0, 1 - (current - this.MIN_RATING) / (this.MAX_RATING - this.MIN_RATING));
  }

  // коэффициент активности (чтобы нельзя было качать только тесты или только собесы)
  private async getActivityFactor(userId: number): Promise<number> {
    const last7days = new Date();
    last7days.setDate(last7days.getDate() - 7);

    const [tests, interviews] = await Promise.all([
      this.prisma.userActionsLog.count({
        where: { user_id: userId, type: EUSER_ACTION_TYPE.TEST, createdAt: { gte: last7days } },
      }),
      this.prisma.userActionsLog.count({
        where: { user_id: userId, type: EUSER_ACTION_TYPE.INTERVIEW, createdAt: { gte: last7days } },
      }),
    ]);

    if (tests === 0 || interviews === 0) return 0.7;
    return Math.min(1, 0.5 + (0.5 * Math.min(tests, interviews)) / Math.max(tests, interviews));
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

    const K = this.getK(current);
    const A = await this.getActivityFactor(userId);

    let delta = Math.round(gain * K * A);

    // если перевалил потолок
    if (current >= this.MAX_RATING) {
      delta = success && score === 10 ? 3 : -30;
    }

    await this.updateUserRating(userId, EUSER_ACTION_TYPE.INTERVIEW, delta, `Interview: score=${score}, success=${success}`);
  }

  async addTestResult(userId: number, level: number, questions: number, correct: number) {
    const userRating = await this.prisma.userRating.findUnique({ where: { user_id: userId } });
    const current = userRating?.tests_rating ?? this.MIN_RATING;

    const percent = correct / questions;
    let base = percent * 100 * level * (questions / 10);

    const K = this.getK(current);
    const A = await this.getActivityFactor(userId);

    let delta = Math.round(base * K * A);

    if (current >= this.MAX_RATING) {
      delta = percent === 1 ? 3 : -30;
    }

    await this.updateUserRating(
      userId,
      EUSER_ACTION_TYPE.TEST,
      delta,
      `Test: level=${level}, q=${questions}, correct=${correct}`
    );
  }
}
