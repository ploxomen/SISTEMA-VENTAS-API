import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value) : value,
  )
  categoryId: number;

  @IsNumber()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value) : value,
  )
  subcategoryId: number;

  @IsNumber()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value) : value,
  )
  brandId: number;

  @IsOptional()
  @IsString()
  model?: string;

  @IsNumber()
  @IsPositive()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value) : value,
  )
  initialStock: number;

  @IsNumber()
  @IsPositive()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseInt(value) : value,
  )
  minimunStock: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  salePrice: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Transform(({ value }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  purchasePrice: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Transform(({ value }) =>
    typeof value === 'string' ? parseFloat(value) : value,
  )
  wholesalePrice?: number;

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  hasExpiration: boolean;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  lots: CreateLoteDto[] = [];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  images: number[];
}
export class CreateLoteDto {
  @IsString()
  @IsNotEmpty()
  lotNumber: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsDate()
  expirationDate: Date;
}
