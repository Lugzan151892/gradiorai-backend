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
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
import { IQuestionResponse } from '../utils/interfaces/questions';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly questionsService: QuestionsService
  ) {}

  @Post('save')
  async saveQuestion(
    @Req() request: Request,
    @Body()
    body: {
      question: string;
      level: Array<number>;
      responses: IQuestionResponse[];
      techs: number[];
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const savedQuestion = await this.questionsService.saveQuestion(body, user.user.id);

    return savedQuestion;
  }

  @Post('edit')
  async editQuestion(
    @Req() request: Request,
    @Body()
    body: {
      id: number;
      question: string;
      level: Array<number>;
      responses: IQuestionResponse[];
      techs: number[];
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new UnauthorizedException('Unauthorized or not and admin!');
    }

    const savedQuestion = await this.questionsService.editQuestions(body);

    return savedQuestion;
  }

  @Get('get')
  async getQuestions(@Query() query: { level?: number; user_id?: number }) {
    if (!query.level) {
      throw new HttpException('Type or level not found', HttpStatus.BAD_REQUEST);
    }

    const questions = await this.questionsService.getNonPassedQuestions(query.level, query.user_id);

    return questions;
  }

  @Post('add-tech')
  async saveTech(
    @Req() request: Request,
    @Body()
    body: {
      name: string;
      description?: string;
      specs?: Array<number>;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new UnauthorizedException('Unauthorized or not an Admin');
    }

    const result = await this.questionsService.saveNewTech(body);

    return result;
  }

  @Post('edit-tech')
  async editTech(
    @Req() request: Request,
    @Body()
    body: {
      id: number;
      name?: string;
      description?: string;
      specs?: Array<number>;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new UnauthorizedException('Unauthorized or not an Admin');
    }

    const result = await this.questionsService.editTech(body);

    return result;
  }

  @Get('get-techs')
  async getTechs(@Query() query: { specs?: string }) {
    const result = await this.questionsService.getTechs(query.specs ? query.specs.split(',').map((el) => +el) : undefined);

    return result;
  }

  @Get('get-specs')
  async getAllSpecs() {
    const result = await this.questionsService.getAllSpecs();

    return result;
  }

  @Post('add-spec')
  async saveSpec(
    @Req() request: Request,
    @Body()
    body: {
      name: string;
      techs?: Array<number>;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new UnauthorizedException('Unauthorized or not an Admin');
    }

    const result = await this.questionsService.saveNewSpec(body);

    return result;
  }

  @Delete('delete-tech')
  async deleteTech(@Req() request: Request, @Body() body: { id: number }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new UnauthorizedException('Unauthorized or not an Admin');
    }

    const result = await this.questionsService.deleteTechById(body.id);

    return result;
  }

  @Post('edit-spec')
  async editSpec(
    @Req() request: Request,
    @Body()
    body: {
      id: number;
      name?: string;
      techs?: Array<number>;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new UnauthorizedException('Unauthorized or not an Admin');
    }

    const result = await this.questionsService.editSpec(body);

    return result;
  }

  @Delete('delete-spec')
  async deleteSpec(@Req() request: Request, @Body() body: { id: number }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new UnauthorizedException('Unauthorized or not an Admin');
    }

    const result = await this.questionsService.deleteSpecById(body.id);

    return result;
  }

  @Post('update-progress')
  async updateQuestionProgress(
    @Req() request: Request,
    @Body()
    body: {
      question_id: number;
    }
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const result = await this.questionsService.saveQuestionProgress(body.question_id, user.user.id);

    return result;
  }

  @Get('questions-list')
  async getAllQuestions(@Req() request: Request, @Query() query: { only_mine: string; only_without_specs: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const result = await this.questionsService.getQuestions(
      query.only_without_specs === 'true',
      query.only_mine === 'true' ? user.user.id : undefined
    );

    return result;
  }

  /** Удаление вопроса */
  @Delete('delete')
  async deleteQuestion(@Req() request: Request, @Body() body: { id: number }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user?.admin) {
      throw new UnauthorizedException('Unauthorized or not an Admin');
    }

    const result = await this.questionsService.deleteQuestionById(body.id);

    return result;
  }
}
