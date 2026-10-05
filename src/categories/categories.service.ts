import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { ApiListResponse } from '../common/interfaces/api-response.interface.js';
import { paginate } from '../common/utils/paginate.utils.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createCategoryDto: CreateCategoryDto) {
    const { subCategories, ...categoryData } = createCategoryDto;
    return this.prisma.category.create({
      data: {
        ...categoryData,
        subCategories: subCategories
          ? {
              create: subCategories
            }
          : undefined,
      },

      include: {
        subCategories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
  async findAll(paginationDto: PaginationDto): Promise<ApiListResponse<any>> {
    return paginate(this.prisma.category, paginationDto, {
      include: {
        subCategories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: true,
      },
    });
    if (!category) {
      throw new NotFoundException(`Categoria no encontrada con el id ${id}`);
    }
    return category;
  }
  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);
    const { subCategories, ...categoryData } = updateCategoryDto;
    return this.prisma.category.update({
      where: { id },
      data: {
        ...categoryData,
        subCategories: {
          deleteMany: {
            id: {
              notIn:
                subCategories
                  ?.map((subCategory) => subCategory.id)
                  .filter((subId): subId is number => Boolean(subId)) || [],
            },
          },
          upsert:
            subCategories?.map((subCategory) => ({
              where: { id: subCategory.id || 0 },
              update: { name: subCategory.name },
              create: { name: subCategory.name },
            })) || [],
        },
      },
      include: {
        subCategories: true,
      },
    });
  }
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.category.delete({
      where: { id },
      include: {
        subCategories: true,
      },
    });
  }
}
