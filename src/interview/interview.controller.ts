import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Req, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { GptService } from '../gpt/gpt.service';
import { IGPTStreamMessageEvent } from '../utils/interfaces/gpt/interfaces';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import { InterviewService } from '../interview/interview.service';

@Controller('interview')
export class InterviewController {
  constructor(
    private readonly gptService: GptService,
    private readonly authService: AuthService,
    private readonly interviewService: InterviewService
  ) {}

  @Get('interview')
  async getInterview(@Req() request: Request, @Query() query: { id: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user.admin) {
      throw new HttpException({ message: 'Пока только для админов.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    if (!query.id) {
      throw new HttpException({ message: 'Некорректно указан id.' }, HttpStatus.BAD_REQUEST);
    }

    const result = await this.interviewService.getInterviewById(query.id);

    if (!result) {
      throw new HttpException({ message: `Интервью с id ${query.id} не найдено.` }, HttpStatus.BAD_REQUEST);
    }

    if (result.user_id !== user.user?.id) {
      throw new HttpException(
        { message: `Интервью с id ${query.id} не Ваше. Можно получить доступ только к своим интервью.` },
        HttpStatus.BAD_REQUEST
      );
    }

    return result;
  }

  @Get('user-interviews')
  async getUserInterviews(@Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user.admin) {
      throw new HttpException({ message: 'Пока только для админов.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    const interviewList = await this.interviewService.getAllUserInterviews(user.user.id);

    return interviewList;
  }

  @Post('message')
  async addUserMessage(@Req() request: Request, @Body() body: { content: string; interviewId: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user.admin) {
      throw new HttpException({ message: 'Пока только для админов.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    const interview = await this.interviewService.getInterviewById(body.interviewId);

    if (!interview) {
      throw new HttpException({ message: `Интервью с id ${body.interviewId} не найдено.` }, HttpStatus.BAD_REQUEST);
    }

    if (interview.user_id !== user.user?.id) {
      throw new HttpException(
        { message: `Интервью с id ${body.interviewId} не Ваше. Можно получить доступ только к своим интервью.` },
        HttpStatus.BAD_REQUEST
      );
    }

    const updatedInterview = await this.interviewService.addMessage({
      interviewId: body.interviewId,
      is_human: true,
      message: body.content,
    });

    return updatedInterview;
  }

  @Post('chat/continue')
  async send(@Req() request: Request, @Body() body: { content: string; interviewId: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user.admin) {
      throw new HttpException({ message: 'Пока только для админов.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    const interview = await this.interviewService.getInterviewById(body.interviewId);

    if (!interview) {
      throw new HttpException({ message: `Интервью с id ${body.interviewId} не найдено.` }, HttpStatus.BAD_REQUEST);
    }

    if (interview.user_id !== user.user?.id) {
      throw new HttpException(
        { message: `Интервью с id ${body.interviewId} не Ваше. Можно получить доступ только к своим интервью.` },
        HttpStatus.BAD_REQUEST
      );
    }

    this.gptService.handleMessage(interview);

    return { status: 'ok' };
  }

  @Post('create')
  async createInterview(
    @Req() request: Request,
    @Body()
    body: {
      user_prompt: string;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user.admin) {
      throw new HttpException({ message: 'Пока только для админов.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    const newInterview = await this.interviewService.createInterview({ user_prompt: body.user_prompt, userId: user.user.id });

    return newInterview;
  }

  @Get('stream')
  @Sse()
  stream(): Observable<IGPTStreamMessageEvent> {
    return this.gptService.getStream();
  }
}
