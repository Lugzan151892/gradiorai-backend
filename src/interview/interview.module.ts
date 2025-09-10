import { forwardRef, Module } from '@nestjs/common';
import { InterviewService } from '@/interview/interview.service';
import { InterviewController } from '@/interview/interview.controller';
import { GptModule } from '@/gpt/gpt.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { FileService } from '@/services/files/file.service';
import { ActionsLogModule } from '@/user/actions-log/actions-log.module';
import { UserRatingService } from '@/user/rating/UserRatingService';

@Module({
  imports: [forwardRef(() => GptModule), PrismaModule, AuthModule, ActionsLogModule],
  providers: [InterviewService, FileService, UserRatingService],
  controllers: [InterviewController],
  exports: [InterviewService],
})
export class InterviewModule {}
