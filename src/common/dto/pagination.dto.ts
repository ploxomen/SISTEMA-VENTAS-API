import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number) // <-- Transforma el string de la URL a número
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number) // <-- Transforma el string de la URL a número
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortDirection ?: String

  @IsOptional()
  @IsString()
  column ?: String
}