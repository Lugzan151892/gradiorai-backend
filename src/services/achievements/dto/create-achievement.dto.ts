import { IsString, IsOptional, IsEnum, IsInt, Min, IsBoolean } from 'class-validator';
import { EACHIEVEMENT_TYPE, EACHIEVEMENT_TRIGGER } from '@prisma/client'; // если у вас сгенерированы типы

export class CreateAchievementDto {
  @IsString() key: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(EACHIEVEMENT_TYPE) type: EACHIEVEMENT_TYPE;
  @IsEnum(EACHIEVEMENT_TRIGGER) trigger: EACHIEVEMENT_TRIGGER;
  @IsOptional() @IsInt() @Min(1) target?: number;
  @IsOptional() @IsInt() reward_points?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
