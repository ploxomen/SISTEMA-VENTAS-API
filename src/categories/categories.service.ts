import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import {
  ApiListResponse,
  ApiResourcesResponse,
} from '../common/interfaces/api-response.interface.js';
import { paginate } from '../common/utils/paginate.utils.js';
import { Category } from '../generated/prisma/client.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<ApiResourcesResponse<Category>> {
    const { subCategories, ...categoryData } = createCategoryDto;
    const category = await this.prisma.category.create({
      data: {
        ...categoryData,
        subCategories: subCategories
          ? {
              create: subCategories,
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
    return {
      data: category,
      message: 'Categoría agregada correctamente',
      success: true,
    };
  }
  async findAll(paginationDto: PaginationDto): Promise<ApiListResponse<any>> {
    const query = {
      select: {
        id: true,
        name: true,
        subCategories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'desc',
      },
    } as const;
    const { page, limit } = paginationDto;
    if (page === 0 && limit === 0) {
      const categories = await this.prisma.category.findMany(query);
      return {
        data: categories,
        pagination: {
          limit: 0,
          page: 0,
          total: categories.length,
          totalPages: 0,
        },
      };
    }
    return paginate(this.prisma.category, paginationDto, query);
  }
  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        subCategories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    if (!category) {
      throw new NotFoundException(`Categoria no encontrada con el id ${id}`);
    }
    return category;
  }
  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ApiResourcesResponse<Category>> {
    await this.findOne(id);
    const { subCategories, ...categoryData } = updateCategoryDto;
    await this.prisma.category.update({
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
    return {
      message: 'Categoría actualizada correctamente',
      success: true,
    };
  }
  async remove(id: number): Promise<ApiResourcesResponse<Category>> {
    await this.findOne(id);
    await this.prisma.category.delete({
      where: { id },
      include: {
        subCategories: true,
      },
    });
    return {
      message: 'Categoría eliminada correctamente',
      success: true,
    };
  }
}
