import { forwardRef, Module } from '@nestjs/common';
import { InterviewService } from './interview.service';
import { InterviewController } from './interview.controller';
import { GptModule } from '../gpt/gpt.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => GptModule), PrismaModule, AuthModule],
  providers: [InterviewService],
  controllers: [InterviewController],
  exports: [InterviewService],
})
export class InterviewModule {}
