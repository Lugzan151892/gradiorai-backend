import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import { IQuestionResponse } from '../utils/interfaces/questions';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly questionsService: QuestionsService
  ) {}

  @Post('save')
  async saveQuestion(
    @Req() request: Request,
    @Body()
    body: {
      question: string;
      type: number;
      level: number;
      responses: IQuestionResponse[];
    }
  ) {
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const user = await this.authService.getUserFromTokens(accessToken, refreshToken);

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const savedQuestion = await this.questionsService.saveQuestion(body, user.user.id);

    return savedQuestion;
  }

  @Get('get')
  async getQuestions(@Query() query: { type?: number; level?: number; user_id?: number }) {
    if (!query.type || !query.level) {
      throw new HttpException('Type or level not found', HttpStatus.BAD_REQUEST);
    }

    const questions = await this.questionsService.getNonPassedQuestions(query.level, query.type, query.user_id);

    return questions;
  }
}
