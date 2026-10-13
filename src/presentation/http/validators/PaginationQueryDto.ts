import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;
export const CURSOR_MAX_LENGTH = 512;

export class PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(CURSOR_MAX_LENGTH)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_PAGE_SIZE)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}
