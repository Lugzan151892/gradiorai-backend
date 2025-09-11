import { IsString, IsOptional, IsEnum, IsInt, Min, IsBoolean } from 'class-validator';
import { AchievementType, AchievementTrigger } from '@prisma/client'; // если у вас сгенерированы типы

export class CreateAchievementDto {
  @IsString() key: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(AchievementType) type: AchievementType;
  @IsEnum(AchievementTrigger) trigger: AchievementTrigger;
  @IsOptional() @IsInt() @Min(1) target?: number;
  @IsOptional() @IsInt() reward_points?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
