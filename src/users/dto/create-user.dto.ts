import {
  IsArray,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DocumentType } from '../../generated/prisma/enums.js';
import { Transform, Type } from 'class-transformer';

export class CreateUserDto {
  @IsEnum(DocumentType, {
    message: 'El tipo de documento debe ser un valor válido',
  })
  documentType: DocumentType;

  @IsString()
  documentNumber: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsDate()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  })
  dateOfBirth?: Date;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];
}
