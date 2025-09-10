# Система авторизации

Универсальная система guard'ов для различных типов авторизации в приложении.

## Режимы авторизации

### 1. `@Public()` - Публичный доступ
Эндпоинт полностью публичный, авторизация не требуется и не проверяется.

```typescript
@Get('advice')
@Public()
async generateAdvice() {
  return await this.service.getAdvice();
}
```

### 2. `@OptionalAuth()` - Опциональная авторизация
Публичный доступ, но если пользователь авторизован, его данные будут доступны для статистики.

```typescript
@Post('generate')
@OptionalAuth()
async generate(@User() user: AuthUser, @Body() body: any) {
  // user.user может быть undefined, если пользователь не авторизован
  const data = await this.service.generate(body, user?.user?.id, user?.user?.admin, user?.userIp);
  return data;
}
```

### 3. `@RequireAuth()` - Требуется авторизация
Эндпоинт доступен только авторизованным пользователям.

```typescript
@Get('profile')
@RequireAuth()
async getProfile(@User() user: AuthUser) {
  // user.user гарантированно существует
  return await this.service.getUserProfile(user.user.id);
}
```

### 4. `@RequireAdmin()` - Требуется авторизация + админские права
Эндпоинт доступен только авторизованным пользователям с админскими правами.

```typescript
@Delete('user/:id')
@RequireAdmin()
async deleteUser(@User() user: AuthUser, @Param('id') id: string) {
  // user.user.admin гарантированно true
  return await this.service.deleteUser(id);
}
```

## Декоратор @User()

Декоратор `@User()` предоставляет информацию о пользователе:

```typescript
interface AuthUser {
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
```

## Примеры использования

### Замена старого кода

**До:**
```typescript
@Get('interview')
async getInterview(@Req() request: Request, @Query() query: { id: string }) {
  const user = await this.authService.getUserFromTokens(request);
  
  if (!user.user) {
    throw new HttpException(
      { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
      HttpStatus.BAD_REQUEST
    );
  }
  
  // логика метода...
}
```

**После:**
```typescript
@Get('interview')
@RequireAuth()
async getInterview(@User() user: AuthUser, @Query() query: { id: string }) {
  // логика метода...
  // проверка авторизации происходит автоматически
}
```

### Проверка админских прав

**До:**
```typescript
@Delete('interview')
async deleteInterview(@Req() request: Request, @Body() body: { id: string }) {
  const user = await this.authService.getUserFromTokens(request);
  
  if (!user.user?.admin) {
    throw new HttpException(
      { message: 'Недостаточно прав.', info: { type: 'admin' } },
      HttpStatus.BAD_REQUEST
    );
  }
  
  // логика метода...
}
```

**После:**
```typescript
@Delete('interview')
@RequireAdmin()
async deleteInterview(@User() user: AuthUser, @Body() body: { id: string }) {
  // логика метода...
  // проверки авторизации и админских прав происходят автоматически
}
```

## Настройка

Guard автоматически применяется ко всем эндпоинтам через `APP_GUARD` в `app.module.ts`. 

По умолчанию все эндпоинты требуют авторизации (`AuthMode.AUTHENTICATED`), если не указан другой режим через декораторы.

## Обработка ошибок

- **401 Unauthorized** - пользователь не авторизован (для `@RequireAuth()` и `@RequireAdmin()`)
- **403 Forbidden** - недостаточно прав (для `@RequireAdmin()` когда пользователь не админ)

Ошибки возвращаются в стандартном формате:
```json
{
  "message": "Только для авторизованных пользователей.",
  "info": { "type": "auth" }
}
```
