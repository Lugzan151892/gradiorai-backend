import { Module } from '@nestjs/common';
import { SystemTasksService } from '@/system/tasks/system-tasks-service';
import { SystemTasksController } from '@/system/tasks/system-tasks.controller';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { GptModule } from '@/gpt/gpt.module';

@Module({
  imports: [AuthModule, PrismaModule, GptModule],
  providers: [SystemTasksService],
  controllers: [SystemTasksController],
})
export class SystemTasksModule {}
