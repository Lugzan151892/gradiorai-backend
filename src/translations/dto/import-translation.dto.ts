import { IsBoolean, IsOptional } from 'class-validator';

export class ImportQueryDto {
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
