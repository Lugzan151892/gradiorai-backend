import { Module } from '@nestjs/common';
import { GptService } from './gpt.service';
import { GptController } from './gpt.controller';
import { AuthModule } from '../auth/auth.module';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [AuthModule, QuestionsModule],
  providers: [GptService],
  controllers: [GptController],
})
export class GptModule {}
