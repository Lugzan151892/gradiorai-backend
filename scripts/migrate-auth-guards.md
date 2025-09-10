# Скрипт миграции на новую систему авторизации

## Шаги для миграции существующих контроллеров

### 1. Добавить импорты
```typescript
// Добавить в импорты контроллера
import { RequireAuth, RequireAdmin, Public, OptionalAuth } from '../auth/decorators/auth.decorator';
import { User, AuthUser } from '../auth/decorators/user.decorator';

// Удалить (если есть)
import { AuthService } from '../auth/auth.service';
import { Request } from 'express';
```

### 2. Удалить AuthService из конструктора
```typescript
// До
constructor(
  private readonly someService: SomeService,
  private readonly authService: AuthService, // <- удалить
) {}

// После  
constructor(
  private readonly someService: SomeService,
) {}
```

### 3. Заменить паттерны авторизации

#### Паттерн: Только для авторизованных
```typescript
// До
async someMethod(@Req() request: Request, @Body() body: any) {
  const user = await this.authService.getUserFromTokens(request);
  
  if (!user.user) {
    throw new HttpException(
      { message: 'Только для авторизованных пользователей.', info: { type: 'auth' } },
      HttpStatus.BAD_REQUEST
    );
  }
  
  // логика...
}

// После
@RequireAuth()
async someMethod(@User() user: AuthUser, @Body() body: any) {
  // логика...
}
```

#### Паттерн: Только для админов
```typescript
// До
async adminMethod(@Req() request: Request, @Body() body: any) {
  const user = await this.authService.getUserFromTokens(request);
  
  if (!user.user?.admin) {
    throw new HttpException(
      { message: 'Недостаточно прав.', info: { type: 'admin' } },
      HttpStatus.BAD_REQUEST
    );
  }
  
  // логика...
}

// После
@RequireAdmin()
async adminMethod(@User() user: AuthUser, @Body() body: any) {
  // логика...
}
```

#### Паттерн: Опциональная авторизация
```typescript
// До
async publicMethod(@Req() request: Request, @Body() body: any) {
  const user = await this.authService.getUserFromTokens(request);
  // используется user?.user?.id для статистики
  
  // логика...
}

// После
@OptionalAuth()
async publicMethod(@User() user: AuthUser, @Body() body: any) {
  // логика...
}
```

#### Паттерн: Полностью публичный
```typescript
// До
async publicMethod(@Body() body: any) {
  // логика без авторизации...
}

// После
@Public()
async publicMethod(@Body() body: any) {
  // логика без авторизации...
}
```

### 4. Обновить проверки владельца ресурса
```typescript
// До
if (resource.user_id !== user.user?.id && !user.user.admin) {
  throw new HttpException(/* ... */);
}

// После (остается без изменений)
if (resource.user_id !== user.user?.id && !user.user.admin) {
  throw new HttpException(/* ... */);
}
```

## Контроллеры для миграции

Найти все контроллеры с паттерном:
```bash
grep -r "getUserFromTokens" src/ --include="*.ts"
```

### Список контроллеров:
- ✅ `src/interview/interview.controller.ts` - мигрирован
- ✅ `src/gpt/gpt.controller.ts` - мигрирован  
- ⏳ `src/user/user.controller.ts`
- ⏳ `src/user/rating/UserRatingController.ts`
- ⏳ `src/user/files/user-files.controller.ts`
- ⏳ `src/translations/translations.controller.ts`
- ⏳ `src/system/tasks/system-tasks.controller.ts`
- ⏳ `src/system/system.controller.ts`
- ⏳ `src/user/system-transactions/system-transactions.controller.ts`
- ⏳ `src/user/actions-log/actions-log.controller.ts`
- ⏳ `src/questions/questions.controller.ts`

## Проверка после миграции

1. Убедиться, что все эндпоинты имеют соответствующие декораторы
2. Проверить, что AuthService удален из конструкторов
3. Запустить тесты
4. Проверить, что все типы авторизации работают корректно
