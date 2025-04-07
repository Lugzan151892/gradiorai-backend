import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
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
      email_code: string;
    },
    @Res({ passthrough: true }) response: Response
  ) {
    if (body.password !== body.repeated_password) {
      throw new HttpException({ message: 'Введенные пароли не совпадают', info: { type: 'password' } }, HttpStatus.BAD_REQUEST);
    }

    const data = await this.authService.registration(body.email, body.password, body.email_code);

    response.cookie('refresh_token', data.refreshToken, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      accessToken: data.accessToken,
    };
  }

  @Get('code-request')
  async requestEmailCode(@Query() query: { email: string }) {
    if (!query.email) {
      throw new HttpException(
        { message: `Пользователь с email ${query.email} не найден`, info: { type: 'email' } },
        HttpStatus.BAD_REQUEST
      );
    }

    await this.authService.sendVerificationCode(query.email);

    return {
      message: `Verification code was sent on email ${query.email}`,
    };
  }

  @Get('restore-code-request')
  async requestRestorePasswordCode(@Query() query: { email: string }) {
    if (!query.email) {
      throw new HttpException(
        { message: `Пользователь с email ${query.email} не найден`, info: { type: 'email' } },
        HttpStatus.BAD_REQUEST
      );
    }

    await this.authService.sendVerificationCode(query.email, true);

    return {
      message: `Verification code was sent on email ${query.email}`,
    };
  }

  @Get('code-check')
  async checkEmailCode(@Query() query: { email: string; code: string }) {
    if (!query.email || !query.code) {
      throw new HttpException('Некорректно введен email или код подтверждения', HttpStatus.BAD_REQUEST);
    }

    const result = await this.authService.checkRestoreCode(query.email, query.code);

    return {
      success: result,
    };
  }

  @Post('restore-password')
  async restorePassword(
    @Body()
    body: {
      email: string;
      code: string;
      password: string;
      repeated_password: string;
    },
    @Res({ passthrough: true }) response: Response
  ) {
    if (body.password !== body.repeated_password) {
      throw new HttpException({ message: 'Введенные пароли не совпадают', info: { type: 'password' } }, HttpStatus.BAD_REQUEST);
    }

    const data = await this.authService.restorePassword(body.email, body.password, body.code);

    return data;
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

  // @Get('user')
  // async getUserData(@Req() request: Request) {
  //   const accessToken = request.headers['authorization']?.split(' ')[1];
  //   const refreshToken = request.cookies['refresh_token'];
  //   const user = await this.authService.getUserFromTokens(accessToken, refreshToken);

  //   if (!user) {
  //     throw new UnauthorizedException('User not found');
  //   }

  //   return {
  //     data: user.user,
  //     accessToken: user.accessToken,
  //   };
  // }

  @Get('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) res: Response) {
    const accessToken = request.headers['authorization']?.split(' ')[1];
    const refreshToken = request.cookies['refresh_token'];
    const result = await this.authService.logout(accessToken, refreshToken);
    res.cookie('refresh_token', '', { maxAge: 0 });

    return result;
  }
}
