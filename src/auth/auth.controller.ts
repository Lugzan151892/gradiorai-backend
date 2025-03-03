import { Body, Controller, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

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
    }
  ) {
    if (body.password !== body.repeated_password) {
      throw new HttpException('Пароли не совпадают', HttpStatus.BAD_REQUEST);
    }
    const user = await this.authService.registration(body.email, body.password);

    return user;
  }
}
