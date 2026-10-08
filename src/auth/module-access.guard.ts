import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service.js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';
import { REQUIRED_MODULE_KEY } from './decorators/require-module.decorator.js';
import type { RequestWithUser } from './auth.guard.js';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }
    const moduleUrl = this.reflector.getAllAndOverride<string>(
      REQUIRED_MODULE_KEY,
      targets,
    );
    // Ruta autenticada sin restricción de módulo
    if (!moduleUrl) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      throw new ForbiddenException('No tiene permisos para acceder a este recurso');
    }
    // Se consulta la BD: un permiso revocado surte efecto sin esperar a que expire el JWT.
    const allowed = await this.prisma.moduleRol.count({
      where: {
        module: { url: moduleUrl },
        rol: { userRoles: { some: { userId: user.sub, isActive: true } } },
      },
    });
    if (!allowed) {
      throw new ForbiddenException('No tiene permisos para acceder a este recurso');
    }
    return true;
  }
}
