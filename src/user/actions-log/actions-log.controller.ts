import { Controller, Get } from '@nestjs/common';
import { ActionsLogService } from './actions-log.service';
import { RequireAdmin } from '../../auth/decorators/auth.decorator';
import { User, AuthUser } from '../../auth/decorators/user.decorator';

@Controller('user/actions-log')
export class ActionsLogController {
  constructor(
    private readonly actionsLogService: ActionsLogService
  ) {}

  @Get('logs')
  @RequireAdmin()
  async getLogs(@User() user: AuthUser) {
    const result = await this.actionsLogService.getLogs();

    return result;
  }
}
