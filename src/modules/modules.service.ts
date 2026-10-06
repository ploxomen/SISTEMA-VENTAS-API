import { Injectable } from '@nestjs/common';
import { CreateModuleDto } from './dto/create-module.dto.js';
import { UpdateModuleDto } from './dto/update-module.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ModulesService {
  
  constructor(private readonly prisma : PrismaService){}

  findAll() {
    return this.prisma.module.findMany({
      select : {
        id: true,
        name : true,
        description : true,
        icon : true
      }
    })
  }

  findOne(id: number) {
    return `This action returns a #${id} module`;
  }

  update(id: number, updateModuleDto: UpdateModuleDto) {
    return `This action updates a #${id} module`;
  }

  remove(id: number) {
    return `This action removes a #${id} module`;
  }
}
