import { AuthService } from 'src/auth/auth.service';
import { UserRatingService } from './UserRatingService';
import { Controller, HttpException, HttpStatus, Body, Post, Get, Delete, Put, Param } from '@nestjs/common';
import { Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('user/rating')
export class UserRatingController {
  constructor(
    private readonly authService: AuthService,
    private readonly userRatingService: UserRatingService
  ) {}

  @Post('update-test-result')
  async updateUserTestResult(@Req() request: Request, @Body() body: { level: number; questions: number; correct: number }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException({ message: 'Пользователь не авторизован.', info: { type: 'user' } }, HttpStatus.BAD_REQUEST);
    }

    const result = await this.userRatingService.addTestResult(user.user.id, body.level, body.questions, body.correct);

    return {
      data: result,
    };
  }

  @Get('get-users-rating')
  async getUsersRating() {
    const users = await this.userRatingService.getUsersRating();

    return {
      data: users,
    };
  }

  @Get('fake-users')
  async getFakeUsers() {
    return await this.userRatingService.getFakeUsers();
  }

  @Get('fake-users/:id')
  async getFakeUser(@Param('id') id: string) {
    return await this.userRatingService.getFakeUser(id);
  }

  @Post('fake-users')
  async createFakeUser(@Body() body: { name: string; total_rating: number }, @Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user || !user?.user.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }
    return await this.userRatingService.createFakeUser(body.name, body.total_rating);
  }

  @Put('fake-users')
  async editFakeUser(@Body() body: { id: string; name: string; total_rating: number }, @Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user || !user?.user.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    return await this.userRatingService.editFakeUser(body.id, body.name, body.total_rating);
  }

  @Delete('fake-users')
  async deleteFakeUser(@Body() body: { id: string }, @Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user || !user?.user.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    return await this.userRatingService.deleteFakeUser(body.id);
  }
}
