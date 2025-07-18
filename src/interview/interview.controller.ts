import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  Sse,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { GptService } from '../gpt/gpt.service';
import { IGPTStreamMessageEvent } from '../utils/interfaces/gpt/interfaces';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import { InterviewService } from '../interview/interview.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { FileService } from '../services/files/file.service';
import { createTempMulterStorage } from '../services/files/custom-storage.service';
import { ActionsLogService } from 'src/user/actions-log/actions-log.service';
import { EUSER_ACTION_TYPE } from 'src/utils/interfaces/enums';

@Controller('interview')
export class InterviewController {
  constructor(
    private readonly gptService: GptService,
    private readonly authService: AuthService,
    private readonly interviewService: InterviewService,
    private readonly fileService: FileService,
    private readonly actionsLog: ActionsLogService
  ) {}

  @Get('interview')
  async getInterview(@Req() request: Request, @Query() query: { id: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException(
        { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
        HttpStatus.BAD_REQUEST
      );
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
      throw new HttpException({ message: 'Только для админов.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    const interviewList = await this.interviewService.getAllUserInterviews(user.user.id);

    return interviewList;
  }

  @Post('message')
  async addUserMessage(@Req() request: Request, @Body() body: { content: string; interviewId: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException(
        { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
        HttpStatus.BAD_REQUEST
      );
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

    if (!user.user) {
      throw new HttpException(
        { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
        HttpStatus.BAD_REQUEST
      );
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

    this.gptService.handleMessage(interview, user.user?.admin);

    return { status: 'ok' };
  }

  @Post('create')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: createTempMulterStorage(),
    })
  )
  async createInterview(
    @Req() request: Request,
    @UploadedFiles() files: Express.Multer.File[],
    @Body()
    body: {
      user_prompt: string;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException(
        { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
        HttpStatus.BAD_REQUEST
      );
    }

    if (!files) {
      throw new HttpException({ message: 'Файлы не добавлены', info: { type: 'files' } }, HttpStatus.BAD_REQUEST);
    }

    const fileMap = Object.fromEntries(files.map((file) => [file.fieldname, file]));

    const userCvFile = fileMap['cv'];
    const userVacFile = fileMap['vac'];

    if (!userCvFile) {
      throw new HttpException({ message: 'Файл резюме обязателен!', info: { type: 'files' } }, HttpStatus.BAD_REQUEST);
    }

    const userCvFileContent = await this.fileService.extractText(userCvFile);
    const userVacFileContent = userVacFile ? await this.fileService.extractText(userVacFile) : undefined;
    const updatedUserPrompt = this.interviewService.updateUserPromptByFiles(
      body.user_prompt,
      userCvFileContent,
      userVacFileContent
    );

    const newInterview = await this.interviewService.createInterview({ user_prompt: updatedUserPrompt, userId: user.user.id });

    await this.actionsLog.createLog({
      type: EUSER_ACTION_TYPE.INTERVIEW,
      interviewId: newInterview.id,
      userId: user.user?.id,
      userIp: user.userIp,
    });

    /** Скрываем сохранение файлов. */
    // const savedFiles = await this.fileService.moveFilesToStorage(
    //   [userCvFile, ...(userVacFile ? [userVacFile] : [])],
    //   user.user.id,
    //   'interview',
    //   newInterview.id,
    //   false
    // );

    // const updatedInterview = await this.interviewService.updateInterviewFiles(
    //   savedFiles.map((file, index) => ({
    //     ...file,
    //     inside_type: !index ? 'cv' : 'vac',
    //   })),
    //   newInterview.id,
    //   user.user.id
    // );

    return newInterview;
  }

  @Delete('delete')
  async deleteTech(@Req() request: Request, @Body() body: { id: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const result = await this.interviewService.deleteInterview(body.id);

    return result;
  }

  @Get('stream')
  @Sse()
  stream(): Observable<IGPTStreamMessageEvent> {
    return this.gptService.getStream();
  }

  @Post('test-resume')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: createTempMulterStorage(),
    })
  )
  async testResume(@Req() request: Request, @UploadedFiles() files: Express.Multer.File[]) {
    const user = await this.authService.getUserFromTokens(request);

    if (!files) {
      throw new HttpException({ message: 'Файлы не добавлены', info: { type: 'files' } }, HttpStatus.BAD_REQUEST);
    }

    const fileMap = Object.fromEntries(files.map((file) => [file.fieldname, file]));
    const userCvFile = fileMap['cv'];

    if (!userCvFile) {
      throw new HttpException({ message: 'Файл резюме обязателен!', info: { type: 'files' } }, HttpStatus.BAD_REQUEST);
    }

    const userCvFileContent = await this.fileService.extractText(userCvFile);
    const checkResult = await this.gptService.checkResumeByFile(userCvFileContent, user.user?.admin);

    await this.actionsLog.createLog({
      type: EUSER_ACTION_TYPE.RESUME_CHECK,
      userId: user.user?.id,
      userIp: user.userIp,
      content: JSON.stringify({
        user_message: userCvFileContent,
        resume_result: checkResult.result,
      }),
    });

    return checkResult;
  }

  @Post('create-resume')
  async createResume(@Req() request: Request, @Body() body: { prompt: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!body.prompt) {
      throw new HttpException({ message: 'Не добавлена информация о себе', info: { type: 'prompt' } }, HttpStatus.BAD_REQUEST);
    }

    const checkResult = await this.gptService.createResumeByDescr(body.prompt, user.user?.admin);

    await this.actionsLog.createLog({
      type: EUSER_ACTION_TYPE.RESUME_CREATE,
      userId: user.user?.id,
      userIp: user.userIp,
      content: JSON.stringify({
        user_message: body.prompt,
        resume_result: checkResult.result,
      }),
    });

    return checkResult;
  }
}
