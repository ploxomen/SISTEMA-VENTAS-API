import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { RequireModule } from '../auth/decorators/require-module.decorator.js';
import { AppModules } from '../auth/app-modules.js';

@Controller('categories')
@RequireModule(AppModules.CATEGORIES)
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

  @Get(":id")
  show(@Param('id', ParseIntPipe) id : number) {
    return this.categoriesService.findOne(id)
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id : number){
    return this.categoriesService.remove(id)
  }
}
