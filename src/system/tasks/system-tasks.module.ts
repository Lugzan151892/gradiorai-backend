import { Module } from '@nestjs/common';
import { SystemTasksService } from './system-tasks-service';
import { SystemTasksController } from './system-tasks.controller';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GptModule } from 'src/gpt/gpt.module';

@Module({
  imports: [AuthModule, PrismaModule, GptModule],
  providers: [SystemTasksService],
  controllers: [SystemTasksController],
})
export class SystemTasksModule {}
