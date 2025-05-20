import { Module } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { InterviewController } from './interview.controller';
import { GptModule } from '../gpt/gpt.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GptService } from 'src/gpt/gpt.service';

@Module({
  imports: [GptModule, PrismaModule],
  providers: [InterviewService],
  controllers: [InterviewController],
})
export class InterviewModule {}
