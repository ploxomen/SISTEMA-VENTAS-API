import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';
import { StringValue } from 'ms';
import { User } from '../generated/prisma/client.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    if (user.status === 'DISABLED') {
      throw new UnauthorizedException('Usuario inactivo');
    }
    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    const accessToken = await this.generateAccessToken(user);

    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
  private async generateAccessToken(user: User) {
    const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    const expiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) as StringValue;
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.lastName + ' ' + user.firstName,
        roles: await this.getUserRoles(user.id),
        type: 'access',
      },
      {
        secret,
        expiresIn,
      },
    );
  }

  private async generateRefreshToken(userId: number) {
    const secret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const expiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) as StringValue;
    const token = await this.jwtService.signAsync(
      {
        sub: userId,
        type: 'refresh',
      },
      {
        secret,
        expiresIn,
      },
    );
    const tokenHash = await bcrypt.hash(token, 10);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return token;
  }
  async getUserRoles(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener todos los roles asociados al usuario
      const userRoles = await tx.userRole.findMany({
        where: { userId },
        include: {
          role: true,
        },
        orderBy: {
          createdAt: 'asc', // Ordenar para garantizar cuál es el "primer" rol
        },
      });

      // Si el usuario no tiene ningún rol asignado
      if (userRoles.length === 0) {
        return [];
      }

      // 2. Verificar si hay al menos un rol activo
      const hasActiveRole = userRoles.some((ur) => ur.isActive);

      // 3. Si no hay ningún rol activo, activar el primero en la base de datos
      if (!hasActiveRole) {
        const firstRole = userRoles[0];

        await tx.userRole.update({
          where: {
            userId_roleId: {
              userId: firstRole.userId,
              roleId: firstRole.roleId,
            },
          },
          data: {
            isActive: true,
          },
        });

        // Actualizar el estado en memoria para retornar la respuesta correcta sin re-consultar
        firstRole.isActive = true;
      }

      // 4. Mapear y retornar la estructura solicitada
      return userRoles.map((ur) => ({
        idRol: ur.role.id,
        nombreRol: ur.role.name,
        iconRol: ur.role.icon,
        isActive: ur.isActive,
      }));
    });
  }
}
