import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TranslationsService } from './translations.service';
import { TranslationsController } from './translations.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [TranslationsService],
  controllers: [TranslationsController],
})
export class TranslationsModule {}
