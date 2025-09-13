import { Body, Controller, Delete, Get, HttpException, HttpStatus, Post, Query } from '@nestjs/common';
import { IQuestionResponse } from '@/utils/interfaces/questions';
import { QuestionsService } from '@/questions/questions.service';
import { RequireAdmin, RequireAuth } from '@/auth/decorators/auth.decorator';
import { AuthUser, User } from '@/auth/decorators/user.decorator';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post('save')
  @RequireAuth()
  async saveQuestion(
    @User() user: AuthUser,
    @Body()
    body: {
      question: string;
      level: Array<number>;
      responses: IQuestionResponse[];
      techs: number[];
    }
  ) {
    return await this.questionsService.saveQuestion(body, user.user.id);
  }

  @Post('edit')
  @RequireAdmin()
  async editQuestion(
    @Body()
    body: {
      id: number;
      question: string;
      level: Array<number>;
      responses: IQuestionResponse[];
      techs: number[];
    }
  ) {
    return await this.questionsService.editQuestions(body);
  }

  @Get('get')
  async getQuestions(@Query() query: { level?: number; user_id?: number }) {
    if (!query.level) {
      throw new HttpException('Type or level not found', HttpStatus.BAD_REQUEST);
    }

    return await this.questionsService.getNonPassedQuestions(query.level, query.user_id);
  }

  @Post('add-tech')
  @RequireAdmin()
  async saveTech(
    @User() _: AuthUser,
    @Body()
    body: {
      name: string;
      description?: string;
      specs?: Array<number>;
    }
  ) {
    return await this.questionsService.saveNewTech(body);
  }

  @Post('edit-tech')
  @RequireAdmin()
  async editTech(
    @Body()
    body: {
      id: number;
      name?: string;
      description?: string;
      specs?: Array<number>;
    }
  ) {
    return await this.questionsService.editTech(body);
  }

  @Get('get-techs')
  async getTechs(@Query() query: { specs?: string }) {
    return await this.questionsService.getTechs(query.specs ? query.specs.split(',').map((el) => +el) : undefined);
  }

  @Get('get-specs')
  async getAllSpecs() {
    return await this.questionsService.getAllSpecs();
  }

  @Post('add-spec')
  @RequireAdmin()
  async saveSpec(
    @Body()
    body: {
      name: string;
      techs?: Array<number>;
    }
  ) {
    return await this.questionsService.saveNewSpec(body);
  }

  @Delete('delete-tech')
  @RequireAdmin()
  async deleteTech(@Body() body: { id: number }) {
    return await this.questionsService.deleteTechById(body.id);
  }

  @Post('edit-spec')
  @RequireAdmin()
  async editSpec(
    @Body()
    body: {
      id: number;
      name?: string;
      techs?: Array<number>;
    }
  ) {
    return await this.questionsService.editSpec(body);
  }

  @Delete('delete-spec')
  @RequireAdmin()
  async deleteSpec(@Body() body: { id: number }) {
    return await this.questionsService.deleteSpecById(body.id);
  }

  @Post('update-progress')
  @RequireAuth()
  async updateQuestionProgress(
    @User() user: AuthUser,
    @Body()
    body: {
      question_id: number;
    }
  ) {
    return await this.questionsService.saveQuestionProgress(body.question_id, user.user.id);
  }

  @Get('questions-list')
  @RequireAuth()
  async getAllQuestions(@User() user: AuthUser, @Query() query: { only_mine: string; only_without_specs: string }) {
    return await this.questionsService.getQuestions(
      query.only_without_specs === 'true',
      query.only_mine === 'true' ? user.user.id : undefined
    );
  }

  /** Удаление вопроса */
  @Delete('delete')
  @RequireAdmin()
  async deleteQuestion(@Body() body: { id: number }) {
    return await this.questionsService.deleteQuestionById(body.id);
  }

  @Post('add-question-passed')
  @RequireAuth()
  async addQuestionPassed(@User() user: AuthUser, @Body() body: { correct: boolean; level: number }) {
    return await this.questionsService.addQuestionPassed(body.correct, user.user.id, body.level);
  }

  @Post('test-passed')
  @RequireAuth()
  async testPassed(@User() user: AuthUser, @Body() body: { score: number }) {
    return await this.questionsService.testPassed(body.score, user.user.id);
  }
}
