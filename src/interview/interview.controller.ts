import { Body, Controller, Get, Post, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { GptService } from '../gpt/gpt.service';
import { IGPTStreamMessageEvent } from '../utils/interfaces/gpt/interfaces';

@Controller('interview')
export class InterviewController {
  constructor(private readonly gptService: GptService) {}

  @Post('message')
  send(@Body() body: { content: string }) {
    this.gptService.handleMessage(body.content);
    return { status: 'ok' };
  }

  // @Post('create')
  // createInterview(@Body() body: {
  //   user_prompt: string
  // }) {

  // }

  @Get('stream')
  @Sse()
  stream(): Observable<IGPTStreamMessageEvent> {
    return this.gptService.getStream();
  }
}
