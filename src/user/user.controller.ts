import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserService } from './user.service';
import { InterviewService } from 'src/interview/interview.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly interviewService: InterviewService
  ) {}

  @Get('user')
  async getUserData(@Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      data: user.user,
      accessToken: user.accessToken,
    };
  }

  @Post('user-review')
  async createReview(
    @Body()
    body: {
      comment: string;
      rating?: number;
    },
    @Req() request: Request
  ) {
    const user = await this.authService.getUserFromTokens(request);
    const result = await this.userService.createNewReview(body, user?.user?.id, user.userIp);

    return result;
  }

  @Get('users')
  async getUsers(@Query() query: { only_admins?: 'true' | 'false' }, @Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user || !user?.user.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }
    const users = await this.userService.getUsers(query.only_admins === 'true');

    return users;
  }

  @Get('reviews')
  async getReviews(@Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user?.user.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const reviews = await this.userService.getAllReviews();

    return reviews;
  }

  @Put('username')
  async setUserName(
    @Body()
    body: {
      username: string;
    },
    @Req() request: Request
  ) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException({ message: 'Пользователь не авторизован.', info: { type: 'user' } }, HttpStatus.BAD_REQUEST);
    }

    return await this.userService.setUserName(user.user.id, body.username);
  }

  @Get('interviews')
  async getInterviews(@Req() request: Request, @Query() query: { period?: string }) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user?.user) {
      throw new HttpException({ message: 'Не авторизован.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    const interviews = await this.interviewService.getAllUserInterviews(user.user.id, query.period);

    return interviews;
  }

  @Delete('user/:id')
  async deleteUser(@Req() request: Request, @Param('id') id: string) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user || !user.user.admin) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    return await this.userService.deleteUser(Number(id));
  }
}
