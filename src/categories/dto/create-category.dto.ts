import { IsArray, IsString, IsNotEmpty, IsOptional, ValidateNested} from 'class-validator';
import { Type } from 'class-transformer';

class CreateSubCategoryDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}

export class CreateCategoryDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSubCategoryDto)
    subCategories: CreateSubCategoryDto[];
}