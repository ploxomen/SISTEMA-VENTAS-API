import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateUserData,
  UpdateUserData,
  UserCredentials,
  UserEntity,
  UsersRepository,
} from './users.repository.js';

/** Proyección única y centralizada: el hash de la contraseña queda excluido. */
const PUBLIC_USER_SELECT = {
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
} as const;

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
  }

  findAll(): Promise<UserEntity[]> {
    return this.prisma.user.findMany({ select: PUBLIC_USER_SELECT });
  }

  findByEmailWithCredentials(email: string): Promise<UserCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        password: true,
        status: true,
      },
    });
  }

  findConflict(email: string, documentNumber: string, excludeId?: number) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { documentNumber }],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { email: true, documentNumber: true },
    });
  }

  create({
    passwordHash,
    roleIds,
    ...data
  }: CreateUserData): Promise<UserEntity> {
    return this.prisma.user.create({
      data: {
        ...data,
        password: passwordHash,
        userRoles: {
          create: roleIds.map((roleId) => ({
            role: { connect: { id: roleId } },
          })),
        },
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  update(id: number, data: UpdateUserData): Promise<UserEntity> {
    return this.prisma.user.update({
      where: { id },
      data,
      select: PUBLIC_USER_SELECT,
    });
  }
}
