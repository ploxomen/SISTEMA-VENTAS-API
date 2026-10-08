import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { StringValue } from 'ms';
import { StatusUser } from '../generated/prisma/enums.js';
import {
  USERS_REPOSITORY,
  type UserEntity,
  type UsersRepository,
} from '../users/repositories/users.repository.js';

// Hash ficticio para igualar el tiempo de respuesta cuando el email no existe.
const DUMMY_HASH = bcrypt.hashSync(randomUUID(), 10);

// El refresh token es un valor de alta entropía: basta un hash rápido.
// (bcrypt solo procesa 72 bytes, que en un JWT son casi iguales entre tokens.)
export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository.findByEmailWithCredentials(
      loginDto.email,
    );
    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user?.password ?? DUMMY_HASH,
    );
    // Mensaje único: no revela si el email existe ni si la cuenta está deshabilitada.
    if (!user || !passwordValid || user.status === StatusUser.DISABLED) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return {
      ...(await this.issueTokens(user)),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async refresh(token: string) {
    const payload = await this.jwtService
      .verifyAsync<{ sub: number; type: string }>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      })
      .catch(() => {
        throw new UnauthorizedException('Sesión no válida');
      });
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Sesión no válida');
    }
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hashToken(token), userId: payload.sub },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión no válida');
    }
    // Revocación atómica: si otro proceso ya lo usó, count será 0.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      // Reutilización de un token ya rotado: posible robo. Se cierran todas las sesiones.
      await this.revokeAll(payload.sub);
      throw new UnauthorizedException('Sesión no válida');
    }
    const user = await this.usersRepository.findById(payload.sub);
    if (!user || user.status === StatusUser.DISABLED) {
      await this.revokeAll(payload.sub);
      throw new UnauthorizedException('Sesión no válida');
    }
    return this.issueTokens(user);
  }

  async logout(token?: string) {
    if (!token) {
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: number) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    user: Pick<UserEntity, 'id' | 'email' | 'firstName' | 'lastName'>,
  ) {
    const accessToken = await this.generateAccessToken(user);
    const { refreshToken, refreshExpiresAt } = await this.generateRefreshToken(
      user.id,
    );
    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private async generateAccessToken(
    user: Pick<UserEntity, 'id' | 'email' | 'firstName' | 'lastName'>,
  ) {
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
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        type: 'refresh',
        jti: randomUUID(),
      },
      {
        secret,
        expiresIn,
      },
    );
    // La expiración en BD (y en la cookie) se toma del propio JWT para que coincidan.
    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);
    const refreshExpiresAt = new Date(exp * 1000);
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId,
        expiresAt: refreshExpiresAt,
      },
    });

    return { refreshToken, refreshExpiresAt };
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
