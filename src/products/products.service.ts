import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FilesService } from '../files/files.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { ApiListResponse } from '../common/interfaces/api-response.interface.js';
import { paginate } from '../common/utils/paginate.utils.js';
import { Prisma, Product } from '../generated/prisma/client.js';
type ProductWithRelations = Prisma.ProductGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    salePrice: true;
    initialStock: true;
    minimunStock: true;
    category: { select: { name: true } };
    productImg: { where: { isPrincipal: true }; select: { url: true } };
  };
}>;
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}
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

  async findAll(paginationDto: PaginationDto): Promise<ApiListResponse<any>> {
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
          minimunStock: true,
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
          url: principalImage ? principalImage.url : null,
          categoryName: product.category.name ?? 'Sin categoría',
        };
      }),
      pagination: { ...products.pagination },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
