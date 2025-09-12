import { IsInt, IsString, IsOptional } from 'class-validator';
import { EACHIEVEMENT_TRIGGER } from '@prisma/client';

export class AchievementEventDto {
  @IsInt() userId: number;
  @IsString() trigger: EACHIEVEMENT_TRIGGER | string;
  @IsOptional() payload?: any; // например { count: 1 } или { score: 85 }
}
