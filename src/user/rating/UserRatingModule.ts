import { Module } from '@nestjs/common';
import { UserRatingController } from '@/user/rating/UserRatingController';
import { UserRatingService } from '@/user/rating/UserRatingService';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [UserRatingService],
  controllers: [UserRatingController],
  exports: [UserRatingService],
})
export class UserRatingModule {}
