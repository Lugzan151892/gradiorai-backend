import { Controller, Get, Param } from '@nestjs/common';
import { UserStatsService } from '@/user/stats/user-stats.service';

@Controller('user/stats')
export class UserStatsController {
  constructor(private stats: UserStatsService) {}

  @Get()
  async get(@Param('id') id: string) {
    return this.stats.getAllStatsForProfile(Number(id));
  }
}
