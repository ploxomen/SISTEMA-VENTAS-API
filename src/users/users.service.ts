import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { StatusUser } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async passwordHash(pass: string) {
    return await bcrypt.hash(pass, 10);
  }
  async create(createUserDto: CreateUserDto) {
    const password = await this.passwordHash(createUserDto.documentNumber);
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password,
        status: StatusUser.RESTORE,
      },
    });
    const { password: passDB, ...result } = user;
    return result;
  }
  async findAll() {
    return this.prisma.user.findMany({
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
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }
  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
    const { password, ...result } = user;
    return result;
  } 
}
