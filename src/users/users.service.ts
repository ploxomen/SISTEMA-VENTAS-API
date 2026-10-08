import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { StatusUser } from '../generated/prisma/enums.js';
import { ApiListResponse } from '../common/interfaces/api-response.interface.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { paginate } from '../common/utils/paginate.utils.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async passwordHash(pass: string) {
    return await bcrypt.hash(pass, 10);
  }
  async create(createUserDto: CreateUserDto) {
    await this.verifiUniqueNumberDocEmail(
      createUserDto.email,
      createUserDto.documentNumber,
    );
    const password = await this.passwordHash(createUserDto.documentNumber);
    const { roleIds, ...formData } = createUserDto;
    const user = await this.prisma.user.create({
      data: {
        ...formData,
        password,
        status: StatusUser.ONLINE,
        userRoles: {
          create: roleIds.map((roleId) => ({
            role: {
              connect: { id: roleId },
            },
          })),
        },
      },
      include: {
        userRoles: {
          select: {
            roleId: true,
          },
        },
      },
    });
    const { password: passDB, ...result } = user;
    return result;
  }
  async findAll(paginationDto: PaginationDto): Promise<ApiListResponse<any>> {
    return paginate(this.prisma.user, paginationDto, {
      select: {
        id: true,
        documentType: true,
        documentNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        address: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });
  }
  async verifiUniqueNumberDocEmail(
    email: string,
    documentNumber: string,
    excludeUserId?: number,
  ) {
    const existUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { documentNumber }],
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { email: true, documentNumber: true },
    });
    if (existUser && existUser.email === email) {
      throw new ConflictException('El correo electrónico ya está registrado');
    } else if (existUser && existUser.documentNumber === documentNumber) {
      throw new ConflictException('El número de documento ya está registrado');
    }
  }
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        documentType: true,
        documentNumber: true,
        firstName: true,
        dateOfBirth: true,
        lastName: true,
        email: true,
        address: true,
        phone: true,
        userRoles: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    const { userRoles, ...userData } = user;

    return {
      ...userData,
      roleIds: userRoles.map(({ roleId }) => roleId),
    };
  }
  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    const { roleIds, ...userData } = updateUserDto;
    return this.prisma.$transaction(async (tx) => {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...userData,
        },
      });
      const uniqueRolesId = [...new Set(roleIds)];
      await tx.userRole.deleteMany({
        where: {
          userId: id,
          ...(uniqueRolesId.length > 0
            ? { roleId: { notIn: uniqueRolesId } }
            : {}),
        },
      });
      if (uniqueRolesId.length > 0) {
        await tx.userRole.createMany({
          data: uniqueRolesId.map((roleId) => ({
            userId: id,
            roleId,
          })),
          skipDuplicates: true,
        });
      }
      const { password, ...result } = user;
      return result;
    });
  }
}
