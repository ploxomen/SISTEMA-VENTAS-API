import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FilesService } from '../files/files.service.js';
import { ApiListResponse } from '../common/interfaces/api-response.interface.js';
import { paginate } from '../common/utils/paginate.utils.js';
import { Prisma } from '../generated/prisma/client.js';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { GetProductsDto } from './dto/get-product.dto.js';
type ProductWithRelations = Prisma.ProductGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    salePrice: true;
    initialStock: true;
    hasExpiration: true;
    minimunStock: true;
    category: { select: { name: true } };
    brand: { select: { name: true } };
    productImg: { where: { isPrincipal: true }; select: { url: true } };
  };
}>;
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}
  getUrlBase(): string {
    return `${this.request.protocol}://${this.request.get('host')}`;
  }
  async create(
    createProductDto: CreateProductDto,
    imageFile: Express.Multer.File[],
  ) {
    const savedImages = await this.filesService.saveProductImages(imageFile);
    const { lots, images, ...productData } = createProductDto;
    try {
      // 2. Crear el producto y sus imágenes en Prisma.
      return await this.prisma.product.create({
        data: {
          ...productData,
          productImg: {
            create: savedImages.map((file, key) => ({
              url: file.path,
              name: file.originalName,
              isPrincipal: images?.some(
                (img, kImg) => kImg === key && img.isPrimary,
              ),
            })),
          },
          productLote: {
            create: lots.map((lot) => ({
              ...lot,
              expirationDate: new Date(`${lot.expirationDate}T00:00:00.000Z`),
            })),
          },
        },
        include: {
          productImg: true,
          productLote: true,
        },
      });
    } catch (error) {
      // Si falla Prisma, deben eliminarse los archivos
      // que ya se guardaron en el disco.
      await this.filesService.deleteProductImages(savedImages);

      throw new InternalServerErrorException(
        'No se pudo registrar el producto',
      );
    }
  }

  async findAll(paginationDto: GetProductsDto): Promise<ApiListResponse<any>> {
    let whereProduct: { categoryId?: number; subcategoryId?: number } = {};
    if (
      paginationDto?.categoryId !== undefined &&
      paginationDto.categoryId !== 0
    ) {
      whereProduct.categoryId = paginationDto.categoryId;
    }
    if (
      paginationDto?.subcategoryId !== undefined &&
      paginationDto.subcategoryId !== 0
    ) {
      whereProduct.subcategoryId = paginationDto.subcategoryId;
    }
    const products = await paginate<ProductWithRelations, any>(
      this.prisma.product as any,
      paginationDto,
      {
        select: {
          id: true,
          name: true,
          description: true,
          salePrice: true,
          initialStock: true,
          hasExpiration: true,
          minimunStock: true,
          brand: {
            select : {
              name:  true
            }
          },
          category: {
            select: {
              name: true,
            },
          },
          productImg: {
            where: {
              isPrincipal: true,
            },
            select: {
              url: true,
            },
            take: 1,
          },
        },
        where: {
          ...whereProduct,
        },
      },
    );
    return {
      data: products.data.map((product) => {
        const principalImage = product.productImg?.[0]; // O product.images?.[0]
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: parseFloat(product.salePrice.toString()),
          stock: product.initialStock,
          minimunStock: product.minimunStock,
          url: principalImage ? this.getUrlBase() + principalImage.url : null,
          categoryName: product.category.name ?? 'Sin categoría',
          brand: product.brand.name ?? 'Sin marca',
          hasExpiration: product.hasExpiration
        };
      }),
      pagination: { ...products.pagination },
    };
  }

  async findOne(id: number) {
    return await this.prisma.product.findFirst({
      include : {
        productLote: true,
        productImg: true
      },
      where : {
        id
      }
    });
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
