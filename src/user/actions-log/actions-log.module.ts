import { Module } from '@nestjs/common';
import { ActionsLogService } from '@/user/actions-log/actions-log.service';
import { ActionsLogController } from '@/user/actions-log/actions-log.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [ActionsLogService],
  controllers: [ActionsLogController],
  exports: [ActionsLogService],
})
export class ActionsLogModule {}
