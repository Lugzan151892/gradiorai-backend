// src/stats/stats.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserStatsService {
  constructor(private prisma: PrismaService) {}

  private startOfWeek(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = (d.getUTCDay() + 6) % 7; // make Monday = 0
    d.setUTCDate(d.getUTCDate() - day);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  async weeklyAnswers(userId: number) {
    const now = new Date();
    const startThisWeek = this.startOfWeek(now);
    const startLastWeek = new Date(startThisWeek);
    startLastWeek.setUTCDate(startThisWeek.getUTCDate() - 7);

    const endThisWeek = new Date(startThisWeek);
    endThisWeek.setUTCDate(startThisWeek.getUTCDate() + 7);

    const countThisWeek = await this.prisma.userQuestionProgress.count({
      where: { user_id: userId, passed_at: { gte: startThisWeek, lt: endThisWeek } },
    });

    const endLastWeek = new Date(startLastWeek);
    endLastWeek.setUTCDate(startLastWeek.getUTCDate() + 7);

    const countLastWeek = await this.prisma.userQuestionProgress.count({
      where: { user_id: userId, passed_at: { gte: startLastWeek, lt: endLastWeek } },
    });

    return {
      thisWeek: countThisWeek,
      lastWeek: countLastWeek,
      diff: countThisWeek - countLastWeek,
    };
  }

  async averageTestScore(userId: number) {
    const agg = await this.prisma.testResult.aggregate({
      where: { user_id: userId },
      _avg: { score: true },
      _count: { id: true },
    });
    return { average: agg._avg?.score ?? 0, count: agg._count.id };
  }

  async consecutiveTestDays(userId: number) {
    // получаем уникальные даты (UTC) когда были тесты, сортируем по убыванию
    const results = await this.prisma.testResult.findMany({
      where: { user_id: userId },
      select: { passed_at: true },
      orderBy: { passed_at: 'desc' },
    });

    // строим массив уникальных дат (yyyy-mm-dd)
    const days = Array.from(new Set(results.map((r) => r.passed_at.toISOString().slice(0, 10))));

    // считаем подряд идущие даты начиная с сегодня
    let streak = 0;
    let current = new Date(); // today
    for (let i = 0; ; i++) {
      const dayStr = current.toISOString().slice(0, 10);
      if (days.includes(dayStr)) {
        streak++;
        // предыдущий день
        current.setUTCDate(current.getUTCDate() - 1);
      } else {
        break;
      }
    }
    return { streak, daysCount: days.length };
  }

  async getAllStatsForProfile(userId: number) {
    const [weekly, avg, streak] = await Promise.all([
      this.weeklyAnswers(userId),
      this.averageTestScore(userId),
      this.consecutiveTestDays(userId),
    ]);
    return {
      weeklyAnswers: weekly,
      averageTestScore: avg,
      consecutiveTestDays: streak,
    };
  }
}
