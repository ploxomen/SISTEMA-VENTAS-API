import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleAccessGuard } from './module-access.guard.js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';
import { REQUIRED_MODULE_KEY } from './decorators/require-module.decorator.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const contextFor = (
  metadata: Record<string, unknown>,
  user?: { sub: number },
): ExecutionContext => {
  const handler = () => undefined;
  Object.entries(metadata).forEach(([key, value]) =>
    Reflect.defineMetadata(key, value, handler),
  );
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
};

describe('ModuleAccessGuard', () => {
  let count: ReturnType<typeof vi.fn>;
  let guard: ModuleAccessGuard;

  beforeEach(() => {
    count = vi.fn();
    guard = new ModuleAccessGuard(new Reflector(), {
      moduleRol: { count },
    } as unknown as PrismaService);
  });

  it('permite rutas públicas sin consultar la BD', async () => {
    await expect(
      guard.canActivate(contextFor({ [IS_PUBLIC_KEY]: true })),
    ).resolves.toBe(true);
    expect(count).not.toHaveBeenCalled();
  });

  it('permite rutas autenticadas sin módulo requerido', async () => {
    await expect(guard.canActivate(contextFor({}, { sub: 1 }))).resolves.toBe(
      true,
    );
    expect(count).not.toHaveBeenCalled();
  });

  it('permite el acceso si el rol activo tiene el módulo', async () => {
    count.mockResolvedValue(1);
    await expect(
      guard.canActivate(contextFor({ [REQUIRED_MODULE_KEY]: '/roles' }, { sub: 7 })),
    ).resolves.toBe(true);
    expect(count).toHaveBeenCalledWith({
      where: {
        module: { url: '/roles' },
        rol: { userRoles: { some: { userId: 7, isActive: true } } },
      },
    });
  });

  it('deniega con 403 si el rol activo no tiene el módulo', async () => {
    count.mockResolvedValue(0);
    await expect(
      guard.canActivate(contextFor({ [REQUIRED_MODULE_KEY]: '/roles' }, { sub: 7 })),
    ).rejects.toThrow(ForbiddenException);
  });
});
