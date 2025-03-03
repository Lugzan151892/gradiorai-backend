import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registration')
  async registration(
    @Body()
    body: {
      email: string;
      password: string;
      repeated_password: string;
    },
    @Res({ passthrough: true }) response: Response
  ) {
    if (body.password !== body.repeated_password) {
      throw new HttpException('Passwords dodo not match', HttpStatus.BAD_REQUEST);
    }
    const data = await this.authService.registration(body.email, body.password);

    response.cookie('refresh_token', data.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: data.accessToken,
    };
  }

  @Post('login')
  async login(
    @Body()
    body: {
      email: string;
      password: string;
    },
    @Res({ passthrough: true }) response: Response
  ) {
    const data = await this.authService.login(body.email, body.password);

    response.cookie('refresh_token', data.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: data.accessToken,
    };
  }
}
