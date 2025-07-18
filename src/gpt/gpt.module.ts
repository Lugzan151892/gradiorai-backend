import { forwardRef, Module } from '@nestjs/common';
import { GptService } from './gpt.service';
import { GptController } from './gpt.controller';
import { AuthModule } from '../auth/auth.module';
import { QuestionsModule } from '../questions/questions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InterviewModule } from '../interview/interview.module';
import { ActionsLogModule } from 'src/user/actions-log/actions-log.module';

@Module({
  imports: [AuthModule, QuestionsModule, PrismaModule, forwardRef(() => InterviewModule), ActionsLogModule],
  providers: [GptService],
  controllers: [GptController],
  exports: [GptService],
})
export class GptModule {}
