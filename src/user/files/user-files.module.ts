import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { FileModule } from '@/services/files/file.module';
import { UserFilesService } from '@/user/files/user-files.service';
import { UserFilesController } from '@/user/files/user-files.controller';
import { AuthModule } from '@/auth/auth.module';
import { AchievementsModule } from '@/services/achievements/achievements.module';

@Module({
  imports: [PrismaModule, FileModule, AuthModule, AchievementsModule],
  providers: [UserFilesService],
  controllers: [UserFilesController],
  exports: [UserFilesService],
})
export class UserFilesModule {}
