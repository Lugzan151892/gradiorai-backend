import { AuthService } from 'src/auth/auth.service';
import { UserRatingService } from './UserRatingService';
import { Controller, HttpException, HttpStatus, Body, Post, Get } from '@nestjs/common';
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
}
