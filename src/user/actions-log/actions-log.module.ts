import { Module } from '@nestjs/common';
import { ActionsLogService } from './actions-log.service';
import { ActionsLogController } from './actions-log.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [ActionsLogService],
  controllers: [ActionsLogController],
  exports: [ActionsLogService],
})
export class ActionsLogModule {}
