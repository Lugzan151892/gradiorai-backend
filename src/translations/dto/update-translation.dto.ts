import { IsString } from 'class-validator';

export class UpdateTranslationDto {
  @IsString() locale: string;
  @IsString() namespace: string;
  @IsString() key: string;
  @IsString() value: string;
  @IsString() password?: string;
}
