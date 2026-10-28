import { IsNumber, IsOptional, Min } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto.js";
import { Type } from "class-transformer";

export class GetProductsDto extends PaginationDto {
    @IsOptional()
    @Type(() => Number)
    @Min(0)
    @IsNumber()
    categoryId ?: number = 0

    @IsOptional()
    @Type(() => Number)
    @Min(0)
    @IsNumber()
    subcategoryId ?: number = 0
}