import { IsInt, IsString, IsOptional } from 'class-validator';
import { AchievementTrigger } from '@prisma/client';

export class AchievementEventDto {
  @IsInt() userId: number;
  @IsString() trigger: AchievementTrigger | string;
  @IsOptional() payload?: any; // например { count: 1 } или { score: 85 }
}
