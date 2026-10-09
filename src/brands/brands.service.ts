import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { Brand } from '../generated/prisma/client.js';
import {
  ApiListResponse,
  ApiResourcesResponse,
} from '../common/interfaces/api-response.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { paginate } from '../common/utils/paginate.utils.js';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(
    createBrandDto: CreateBrandDto,
  ): Promise<ApiResourcesResponse<Brand>> {
    const brand = await this.prisma.brand.create({
      data: createBrandDto,
    });
    return {
      data: brand,
      message: 'Marca creada correctamente',
      success: true,
    };
  }

  async findAll(paginationDto: PaginationDto): Promise<ApiListResponse<any>> {
    const query = {
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'desc',
      },
    } as const;
    const { page, limit } = paginationDto;
    if (page === 0 && limit === 0) {
      const brands = await this.prisma.brand.findMany(query);
      return {
        data: brands,
        pagination: {
          limit: 0,
          page: 0,
          total: brands.length,
          totalPages: 0,
        },
      };
    }
    return paginate(this.prisma.brand, paginationDto, query);
  }

  async findOne(id: number) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });
    if (!brand) {
      throw new NotFoundException(`Marca no encontrada con el id ${id}`);
    }
    return brand;
  }
  async update(
    id: number,
    updateBrandDto: UpdateBrandDto,
  ): Promise<ApiResourcesResponse<Brand>> {
    await this.findOne(id);
    await this.prisma.brand.update({
      where: { id },
      data: {
        ...updateBrandDto,
      },
    });
    return {
      message: 'Marca actualizada correctamente',
      success: true,
    };
  }
  async remove(id: number): Promise<ApiResourcesResponse<Brand>> {
    await this.findOne(id);
    await this.prisma.brand.delete({
      where: { id },
    });
    return {
      message: 'Marca actualizada correctamente',
      success: true,
    };
  }
}
