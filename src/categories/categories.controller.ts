import { Body, Controller, Get, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}
  @Post()
  create(@Body() CreateCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(CreateCategoryDto);
  }
  @Get()
  get(@Body() paginationDto: PaginationDto){
    return this.categoriesService.findAll(paginationDto)
  }
}
