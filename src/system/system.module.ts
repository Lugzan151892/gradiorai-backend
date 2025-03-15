import { Module } from '@nestjs/common';
import { SystemService } from './system.service';
import { SystemController } from './system.controller';
import { AuthModule } from '../auth/auth.module';
import { GptModule } from 'src/gpt/gpt.module';
import { GptService } from 'src/gpt/gpt.service';
import { QuestionsModule } from 'src/questions/questions.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AuthModule, QuestionsModule, PrismaModule, GptModule],
  providers: [SystemService, GptService],
  controllers: [SystemController],
})
export class SystemModule {}
