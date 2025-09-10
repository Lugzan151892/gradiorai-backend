import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '@/auth/auth.service';
import { Request } from 'express';

export enum AuthMode {
  PUBLIC = 'public',           // Публичный доступ, авторизация не требуется
  OPTIONAL = 'optional',       // Публичный доступ, но авторизация опциональна (для статистики)
  AUTHENTICATED = 'authenticated', // Требуется авторизация
  ADMIN = 'admin'             // Требуется авторизация + админские права
}

export const AUTH_MODE_KEY = 'authMode';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authMode = this.reflector.get<AuthMode>(AUTH_MODE_KEY, context.getHandler()) || AuthMode.AUTHENTICATED;
    
    // Для публичных эндпоинтов просто пропускаем
    if (authMode === AuthMode.PUBLIC) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = await this.authService.getUserFromTokens(request);

    // Добавляем информацию о пользователе в request для использования в контроллере
    request['userAuth'] = user;

    switch (authMode) {
      case AuthMode.OPTIONAL:
        // Для опциональной авторизации всегда пропускаем, но пользователь может быть undefined
        return true;

      case AuthMode.AUTHENTICATED:
        if (!user.user) {
          throw new HttpException(
            { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
            HttpStatus.UNAUTHORIZED
          );
        }
        return true;

      case AuthMode.ADMIN:
        if (!user.user) {
          throw new HttpException(
            { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
            HttpStatus.UNAUTHORIZED
          );
        }
        if (!user.user.admin) {
          throw new HttpException(
            { message: 'Недостаточно прав доступа.', info: { type: 'admin' } },
            HttpStatus.FORBIDDEN
          );
        }
        return true;

      default:
        return false;
    }
  }
}
