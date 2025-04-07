import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @Get('user')
  async getUserData(@Req() request: Request) {
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const user = await this.authService.getUserFromTokens(accessToken, refreshToken);

    if (!user) {
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
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const user = await this.authService.getUserFromTokens(accessToken, refreshToken);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const result = await this.userService.createNewReview(body, user.user.id);

    return result;
  }
}
