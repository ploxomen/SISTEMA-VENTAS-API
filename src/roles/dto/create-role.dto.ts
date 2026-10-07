import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateRoleDto {
    @IsNumber()
    @IsOptional()
    id?: number;

    @IsString()
    name : string

    @IsString()
    icon : string

    @IsString()
    @IsOptional()
    description : string

    @IsArray()
    modules : number[]
}
