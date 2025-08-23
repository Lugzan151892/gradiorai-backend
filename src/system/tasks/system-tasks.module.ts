import { Module } from '@nestjs/common';
import { SystemTasksService } from './system-tasks-service';
import { SystemTasksController } from './system-tasks.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [SystemTasksService],
  controllers: [SystemTasksController],
})
export class SystemTasksModule {}
