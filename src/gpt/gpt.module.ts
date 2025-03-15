import { Module } from '@nestjs/common';
import { GptService } from './gpt.service';
import { GptController } from './gpt.controller';
import { AuthModule } from '../auth/auth.module';
import { QuestionsModule } from '../questions/questions.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, QuestionsModule, PrismaModule],
  providers: [GptService],
  controllers: [GptController],
})
export class GptModule {}
