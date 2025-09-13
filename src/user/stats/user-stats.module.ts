import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { UserStatsService } from '@/user/stats/user-stats.service';
import { UserStatsController } from '@/user/stats/user-stats.controller';

@Module({
  imports: [PrismaModule],
  providers: [UserStatsService],
  controllers: [UserStatsController],
  exports: [UserStatsService],
})
export class UserStatsModule {}
