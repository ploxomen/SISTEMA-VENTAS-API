import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FilesService } from '../files/files.service.js';

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
    console.log(images);
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
          productLote: true
        },
      });
    } catch (error) {
      console.log(error);
      // Si falla Prisma, deben eliminarse los archivos
      // que ya se guardaron en el disco.
      await this.filesService.deleteProductImages(savedImages);

      throw new InternalServerErrorException(
        'No se pudo registrar el producto',
      );
    }
  }

  findAll() {
    return `This action returns all products`;
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
