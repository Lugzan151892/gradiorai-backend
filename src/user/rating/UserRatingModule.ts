import { Module } from '@nestjs/common';
import { UserRatingController } from './UserRatingController';
import { UserRatingService } from './UserRatingService';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [UserRatingService],
  controllers: [UserRatingController],
  exports: [UserRatingService],
})
export class UserRatingModule {}
