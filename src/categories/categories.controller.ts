import { Body, Controller, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  @Post()
  create(@Body() CreateCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(CreateCategoryDto);
  }
}
