import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateBrandDto {
    @IsOptional()
    @IsInt()
    id ?: number

    @IsString()
    name : string
}
