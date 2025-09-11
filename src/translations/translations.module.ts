import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { TranslationsService } from '@/translations/translations.service';
import { TranslationsController } from '@/translations/translations.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [TranslationsService],
  controllers: [TranslationsController],
})
export class TranslationsModule {}
