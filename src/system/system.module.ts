import { Module } from '@nestjs/common';
import { SystemService } from '@/system/system.service';
import { SystemController } from '@/system/system.controller';
import { AuthModule } from '@/auth/auth.module';
import { GptModule } from '@/gpt/gpt.module';
import { GptService } from '@/gpt/gpt.service';
import { QuestionsModule } from '@/questions/questions.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { InterviewModule } from '@/interview/interview.module';
import { ActionsLogModule } from '@/user/actions-log/actions-log.module';

@Module({
  imports: [AuthModule, QuestionsModule, PrismaModule, GptModule, InterviewModule, ActionsLogModule],
  providers: [SystemService, GptService],
  controllers: [SystemController],
})
export class SystemModule {}
