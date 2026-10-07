import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createRoleDto: CreateRoleDto) {
    const { modules, ...roleData } = createRoleDto;
    return this.prisma.role.create({
      data: {
        ...roleData,
        moduleRol: {
          create: modules.map((moduleId) => ({
            module: {
              connect: { id: moduleId },
            },
          })),
        },
      }
    });
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      select: {
        id: true,
        name: true,
        icon: true,
        description: true,
        moduleRol: {
          select: {
            module: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      icon: role.icon,
      description: role.description,
      modules: role.moduleRol.map((mr) => mr.module),
    }));
  }

  findOne(id: number) {
    return `This action returns a #${id} role`;
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return `This action updates a #${id} role`;
  }

  remove(id: number) {
    return `This action removes a #${id} role`;
  }
}
