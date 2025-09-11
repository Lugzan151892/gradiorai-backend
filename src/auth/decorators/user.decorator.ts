import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Декоратор для получения информации о пользователе из request
 * Использует данные, добавленные AuthGuard'ом
 */
export const User = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.userAuth;
  },
);

/**
 * Типы для пользователя
 */
export interface AuthUser {
  user?: {
    id: number;
    email: string;
    created_at: string;
    updated_at: true;
    admin: true;
  };
  accessToken?: string;
  refreshToken?: string;
  userIp: string;
}
