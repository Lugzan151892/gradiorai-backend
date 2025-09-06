import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SystemTransactionModule } from './system-transactions/system-transactions.module';
import { InterviewModule } from 'src/interview/interview.module';
import { UserRatingService } from './rating/UserRatingService';
import { UserRatingModule } from './rating/UserRatingModule';
import { UserFilesModule } from './files/user-files.module';

@Module({
  imports: [PrismaModule, AuthModule, SystemTransactionModule, InterviewModule, UserRatingModule, UserFilesModule],
  providers: [UserService, UserRatingService],
  controllers: [UserController],
  exports: [UserService, UserRatingService, UserRatingModule, UserFilesModule],
})
export class UserModule {}
