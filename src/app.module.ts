import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GptModule } from './gpt/gpt.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './questions/questions.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    PrismaModule,
    GptModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    QuestionsModule,
    SystemModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
