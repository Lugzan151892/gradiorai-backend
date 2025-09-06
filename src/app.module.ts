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
import { SystemFilesModule } from './system/files/system-files.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SystemTasksModule } from './system/tasks/system-tasks.module';
import { TranslationsModule } from './translations/translations.module';

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
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads/public'),
      serveRoot: '/public',
    }),
    AuthModule,
    QuestionsModule,
    SystemModule,
    UserModule,
    InterviewModule,
    SystemFilesModule,
    SystemTasksModule,
    TranslationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IpLoggerMiddleware).forRoutes('*');
  }
}
