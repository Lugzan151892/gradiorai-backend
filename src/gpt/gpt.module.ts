import { forwardRef, Module } from '@nestjs/common';
import { GptService } from '@/gpt/gpt.service';
import { GptController } from '@/gpt/gpt.controller';
import { AuthModule } from '@/auth/auth.module';
import { QuestionsModule } from '@/questions/questions.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { InterviewModule } from '@/interview/interview.module';
import { ActionsLogModule } from '@/user/actions-log/actions-log.module';
import { AchievementsModule } from '@/services/achievements/achievements.module';

@Module({
  imports: [AuthModule, QuestionsModule, PrismaModule, forwardRef(() => InterviewModule), ActionsLogModule, AchievementsModule],
  providers: [GptService],
  controllers: [GptController],
  exports: [GptService],
})
export class GptModule {}
