import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AchievementsService } from '@/services/achievements/achievements.service';
import { AchievementsController } from '@/services/achievements/achievements.controller';
import { FileModule } from '@/services/files/file.module';

@Module({
  imports: [PrismaModule, FileModule],
  providers: [AchievementsService],
  controllers: [AchievementsController],
  exports: [AchievementsService],
})
export class AchievementsModule {}
