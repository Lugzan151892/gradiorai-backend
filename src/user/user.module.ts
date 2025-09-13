import { Module } from '@nestjs/common';
import { UserService } from '@/user/user.service';
import { UserController } from '@/user/user.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { SystemTransactionModule } from '@/user/system-transactions/system-transactions.module';
import { InterviewModule } from '@/interview/interview.module';
import { UserRatingService } from '@/user/rating/UserRatingService';
import { UserRatingModule } from '@/user/rating/UserRatingModule';
import { UserFilesModule } from '@/user/files/user-files.module';
import { AchievementsModule } from '@/services/achievements/achievements.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SystemTransactionModule,
    InterviewModule,
    UserRatingModule,
    UserFilesModule,
    AchievementsModule,
  ],
  providers: [UserService, UserRatingService],
  controllers: [UserController],
  exports: [UserService, UserRatingService, UserRatingModule, UserFilesModule],
})
export class UserModule {}
