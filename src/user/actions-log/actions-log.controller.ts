import { Controller, Get } from '@nestjs/common';
import { ActionsLogService } from '@/user/actions-log/actions-log.service';
import { RequireAdmin } from '@/auth/decorators/auth.decorator';

@Controller('user/actions-log')
export class ActionsLogController {
  constructor(private readonly actionsLogService: ActionsLogService) {}

  @Get('logs')
  @RequireAdmin()
  async getLogs() {
    const result = await this.actionsLogService.getLogs();

    return result;
  }
}
