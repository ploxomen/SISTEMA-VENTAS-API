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
    return {
      id: role.id,
      name: role.name,
      icon: role.icon,
      description: role.description,
      modules: role.moduleRol.map((mr) => mr.module.id),
    };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id);
    return this.syncModules(id, updateRoleDto.modules!);
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
  async syncModules(roleId: number, moduleIds: number[]) {
    return this.prisma.$transaction(async (tx) => {
        // IDs únicos
        const newIds = [...new Set(moduleIds)];
        // Relaciones actuales
        const current = await tx.moduleRol.findMany({
            where: {
                rolId: roleId,
            },
            select: {
                moduleId: true,
            },
        });
        const currentIds = current.map((item) => item.moduleId);
        // Lo que debemos eliminar
        const idsToDelete = currentIds.filter(
            (id) => !newIds.includes(id),
        );
        // Lo que debemos agregar
        const idsToCreate = newIds.filter(
            (id) => !currentIds.includes(id),
        );
        // DELETE solamente los que ya no existen
        if (idsToDelete.length > 0) {
            await tx.moduleRol.deleteMany({
                where: {
                    rolId: roleId,
                    moduleId: {
                        in: idsToDelete,
                    },
                },
            });
        }
        // INSERT solamente los nuevos
        if (idsToCreate.length > 0) {
            await tx.moduleRol.createMany({
                data: idsToCreate.map((moduleId) => ({
                    rolId: roleId,
                    moduleId,
                })),
                skipDuplicates: true,
            });
        }
        return tx.moduleRol.findMany({
            where: {
                rolId: roleId,
            },
            include: {
                module: true,
            },
        });
    });
}
}
