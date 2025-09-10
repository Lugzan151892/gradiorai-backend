import { SetMetadata } from '@nestjs/common';
import { AuthMode, AUTH_MODE_KEY } from '@/auth/guards/auth.guard';

/**
 * Декоратор для настройки режима авторизации
 * @param mode - режим авторизации
 */
export const Auth = (mode: AuthMode) => SetMetadata(AUTH_MODE_KEY, mode);

/**
 * Публичный эндпоинт - авторизация не требуется
 */
export const Public = () => Auth(AuthMode.PUBLIC);

/**
 * Опциональная авторизация - публичный доступ, но пользователь может быть авторизован для статистики
 */
export const OptionalAuth = () => Auth(AuthMode.OPTIONAL);

/**
 * Требуется авторизация
 */
export const RequireAuth = () => Auth(AuthMode.AUTHENTICATED);

/**
 * Требуется авторизация + админские права
 */
export const RequireAdmin = () => Auth(AuthMode.ADMIN);
