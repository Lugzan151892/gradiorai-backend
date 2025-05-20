import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GptModule } from './gpt/gpt.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { QuestionsModule } from './questions/questions.module';
import { SystemModule } from './system/system.module';
import { IpLoggerMiddleware } from './middleware/ip-logger.middleware';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston/winston.config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { UserModule } from './user/user.module';
import { InterviewModule } from './interview/interview.module';

@Module({
  imports: [
    PrismaModule,
    GptModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    WinstonModule.forRoot({
      instance: winstonConfig,
    }),
    RedisModule.forRoot({
      type: 'single',
      url: 'redis://localhost:6379',
    }),
    AuthModule,
    QuestionsModule,
    SystemModule,
    UserModule,
    InterviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpLoggerMiddleware).forRoutes('*');
  }
}
