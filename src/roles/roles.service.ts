import { Injectable, NotFoundException } from '@nestjs/common';
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
      },
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

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
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
    if (!role) {
      throw new NotFoundException(`Rol no encontrado con el id ${id}`);
    }
    return { ...role, modules: role.moduleRol.map((mr) => mr.module) };
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return `This action updates a #${id} role`;
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.role.delete({
      where: { id },
      include: {
        moduleRol: true,
        userRoles: true,
      },
    });
    return {
      message: 'Rol eliminado correctamente',
      success: true,
    };
  }
}
