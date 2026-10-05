import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DocumentType } from '../../generated/prisma/enums.js';

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
}
