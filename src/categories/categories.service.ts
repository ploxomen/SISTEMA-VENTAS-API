import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { create } from 'domain';

@Injectable()
export class CategoriesService {
    constructor(
        private readonly prisma: PrismaService
    ){}
    async create(createCategoryDto : CreateCategoryDto){
        const {subCategories, ...categoryData} = createCategoryDto;
        return this.prisma.category.create({
            data : {
                ...categoryData,
                subCategories : subCategories ? { create : subCategories } : undefined
            },
            include : {
                subCategories : true
            }
        })
    }
}
