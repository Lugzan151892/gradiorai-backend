import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response, Request } from 'express';

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

  @Get('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) res: Response) {
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const result = await this.authService.logout(accessToken, refreshToken);
    res.cookie('refresh_token', '', { maxAge: 0 });

    return result;
  }
}
