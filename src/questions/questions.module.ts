import { Module } from '@nestjs/common';
import { QuestionsService } from '@/questions/questions.service';
import { QuestionsController } from '@/questions/questions.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { AchievementsModule } from '@/services/achievements/achievements.module';

@Module({
  imports: [PrismaModule, AuthModule, AchievementsModule],
  providers: [QuestionsService],
  controllers: [QuestionsController],
  exports: [QuestionsService],
})
export class QuestionsModule {}
