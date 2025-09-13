// src/achievements/achievements.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { EACHIEVEMENT_TRIGGER } from '@prisma/client';
import { IFile } from '@/utils/interfaces/files';
import { getBoolean } from '@/utils/request';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private prisma: PrismaService) {}

  // Create achievement, image already создан в SystemFile и передаётся systemFileId
  async create(dto: CreateAchievementDto, file?: IFile) {
    return this.prisma.achievement.create({
      data: {
        key: dto.key,
        title: dto.title,
        description: dto.description ?? '',
        type: dto.type,
        trigger: dto.trigger,
        target: dto.target ? +dto.target : null,
        reward_points: dto.reward_points ? +dto.reward_points : 0,
        ...(file && {
          image: {
            create: {
              filename: file?.filename,
              path: file?.path,
              original_name: file?.originalName,
              mimetype: file?.mimetype,
              size: file?.size,
              key: dto?.key,
            },
          },
        }),
        active: getBoolean(dto.active) ?? true,
      },
    });
  }

  async update(id: number, dto: UpdateAchievementDto, file?: IFile) {
    return this.prisma.achievement.update({
      where: { id },
      data: {
        ...dto,
        ...(file && {
          image: {
            upsert: {
              create: {
                filename: file.filename,
                path: file.path,
                original_name: file.originalName,
                mimetype: file.mimetype,
                size: file.size,
                key: dto.key ?? undefined,
              },
              update: {
                filename: file.filename,
                path: file.path,
                original_name: file.originalName,
                mimetype: file.mimetype,
                size: file.size,
                key: dto.key ?? undefined,
              },
            },
          },
        }),
      },
    });
  }

  async delete(id: number) {
    // мягкое удаление? тут делаем жёсткое - удаление. Можно добавить active=false вместо удаления.
    return this.prisma.achievement.delete({ where: { id } });
  }

  async getOne(id: number) {
    return this.prisma.achievement.findUnique({ where: { id } });
  }

  // Возвращает все достижения, а также прогресс для конкретного пользователя (если передан userId)
  async getAllWithProgress(userId?: number) {
    const achievements = await this.prisma.achievement.findMany({
      where: { active: true },
      orderBy: { created_at: 'desc' },
      include: { image: true },
    });

    if (!userId) return achievements.map((a) => ({ ...a, progress: null }));

    const progressList = await this.prisma.userAchievement.findMany({
      where: { user_id: userId },
    });
    const map = new Map(progressList.map((p) => [p.achievement_id, p]));

    return achievements.map((a) => {
      const p = map.get(a.id);
      return {
        ...a,
        userProgress: p
          ? { progress: p.progress, completed: p.completed, completed_at: p.completed_at }
          : { progress: 0, completed: false },
      };
    });
  }

  // Основной обработчик ивентов: вызываем при событии.
  async handleEvent(userId: number, trigger: EACHIEVEMENT_TRIGGER | string, payload?: any) {
    // 1. Находим все активные достижения с данным триггером
    const achievements = await this.prisma.achievement.findMany({
      where: { trigger: trigger as EACHIEVEMENT_TRIGGER, active: true },
    });

    if (!achievements.length) return { updated: [], completed: [] };

    const results = { updated: [], completed: [] };

    for (const ach of achievements) {
      // Загружаем/создаём UserAchievement
      let userAch = await this.prisma.userAchievement.findUnique({
        where: { user_id_achievement_id: { user_id: userId, achievement_id: ach.id } as any },
      });

      if (!userAch) {
        userAch = await this.prisma.userAchievement.create({
          data: { user_id: userId, achievement_id: ach.id, progress: 0, completed: false },
        });
      }

      if (userAch.completed) continue; // уже завершено

      let delta = 0;
      if (ach.type === 'ONESHOT') {
        // ONESHOT: просто пометить как завершённое при первом соответствующем событии
        delta = ach.target ? ach.target - userAch.progress : 1;
      } else if (ach.type === 'PROGRESS') {
        // логика инкремента — зависит от trigger:
        switch (ach.trigger) {
          case 'ANSWER_QUESTION':
            // payload.count или 1
            delta = payload?.count ? Number(payload.count) : 1;
            break;
          case 'PASS_TEST':
            // можно увеличивать на 1 за каждый пройденный тест: либо учитывать score для других типов
            delta = payload?.count ? Number(payload.count) : 1;
            break;
          default:
            delta = payload?.count ? Number(payload.count) : 1;
        }
      }

      if (delta <= 0) continue;

      const newProgress = userAch.progress + delta;
      const willComplete = ach.type === 'ONESHOT' ? true : ach.target ? newProgress >= ach.target : false;

      // Транзакция: апдейт прогресса, лог, и при завершении — начисление очков/уровня
      await this.prisma.$transaction(async (prisma) => {
        // обновляем userAchievement
        await prisma.userAchievement.update({
          where: { id: userAch.id },
          data: {
            progress: willComplete ? (ach.target ?? newProgress) : newProgress,
            completed: willComplete,
            completed_at: willComplete ? new Date() : undefined,
          },
        });

        // логируем изменение
        await prisma.userAchievementLog.create({
          data: {
            user_achievement_id: userAch.id,
            user_id: userId,
            achievement_id: ach.id,
            delta,
            progress_after: willComplete ? (ach.target ?? newProgress) : newProgress,
            note: `Trigger ${ach.trigger}`,
          },
        });

        if (willComplete && ach.reward_points && ach.reward_points > 0) {
          // начисляем очки пользователю
          await prisma.user.update({
            where: { id: userId },
            data: { points: { increment: ach.reward_points } },
          });

          // обновляем уровень при необходимости — простой пример: levelUp если points >= level*1000
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user) {
            let targetLevel = user.level;
            let newPoints = (user.points ?? 0) + ach.reward_points;
            while (newPoints >= targetLevel * 2 * 100) {
              targetLevel++;
            }
            if (targetLevel > user.level) {
              await prisma.user.update({ where: { id: userId }, data: { level: targetLevel } });
            }
          }
        }
      });

      results.updated.push({
        achievementId: ach.id,
        userId,
        newProgress: willComplete ? (ach.target ?? newProgress) : newProgress,
      });
      if (willComplete) results.completed.push({ achievementId: ach.id, userId });
    }

    return results;
  }
}
