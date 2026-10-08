import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';
import { StringValue } from 'ms';
import { ModuleGroup, User } from '../generated/prisma/client.js';

interface ModuleList {
  idModule : number,
  nameModule : string,
  iconModule : string,
  urlModule : string,
  idGroup ?: number | null,
  nameGroup ?: string | null,
  iconGroup ?: string | null
}
interface GroupedModule {
  idGroup: number;
  nameGroup?: string;
  iconGroup?: string;
  modules: {
    idModule: number;
    nameModule: string;
    iconModule: string;
    urlModule: string;
  }[];
}
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
  async getModules(rolId: number) {
    const modules = await this.prisma.moduleRol.findMany({
      where: { rolId },
      include: {
        module: {
          include: {
            moduleGroup: true,
          },
        },
      },
    });
    const moduleData = modules.map((m) => ({
      idModule: m.module.id,
      nameModule: m.module.name,
      iconModule: m.module.icon,
      urlModule: m.module.url,
      idGroup: m.module.moduleGroup?.id,
      nameGroup: m.module.moduleGroup?.name,
      iconGroup: m.module.moduleGroup?.icon,
    }));
    return this.groupedModules(moduleData);
  }
  private groupedModules(modules : Array<ModuleList>) : GroupedModule[] {
    const groups = modules.reduce<Record<number, GroupedModule>>(
    (groups, module) => {
      const groupId = module.idGroup;
      if (!groupId) {
        return groups;
      }
      if (!groups[groupId]) {
        groups[groupId] = {
          idGroup: groupId,
          nameGroup: module.nameGroup || "",
          iconGroup: module.iconGroup || "",
          modules: [],
        };
      }

      groups[groupId].modules.push({
        idModule: module.idModule,
        nameModule: module.nameModule,
        iconModule: module.iconModule,
        urlModule: module.urlModule,
      });

      return groups;
    },
    {},
  );

  return Object.values(groups);
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
