import { IsNumber, IsOptional, ValidateNested } from "class-validator";
import { CreateCategoryDto } from "./create-category.dto.js";
import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
}