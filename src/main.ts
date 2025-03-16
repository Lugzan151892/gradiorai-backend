import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './utils/errors/exception.filter';
import { winstonConfig } from './config/winston/winston.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
  });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 5000;
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(port);
  Logger.log('info', `Application is running on: http://localhost:${port}`);
}
bootstrap();
