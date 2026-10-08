import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService, hashToken } from './auth.service.js';
import type { UsersRepository } from '../users/repositories/users.repository.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const env: Record<string, string> = {
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

describe('AuthService', () => {
  const jwt = new JwtService({});
  const config = { getOrThrow: (key: string) => env[key] } as ConfigService;
  let prisma: any;
  let usersRepository: Record<keyof UsersRepository, ReturnType<typeof vi.fn>>;
  let service: AuthService;

  const activeUser = {
    id: 1,
    email: 'saul@ventas.pe',
    firstName: 'Saul',
    lastName: 'Perez',
    status: 'ONLINE',
  };

  beforeEach(() => {
    prisma = {
      refreshToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      // getUserRoles se ejecuta dentro de una transacción
      $transaction: vi.fn().mockResolvedValue([]),
    };
    usersRepository = {
      findById: vi.fn().mockResolvedValue(activeUser),
      findAll: vi.fn(),
      findByEmailWithCredentials: vi.fn(),
      findConflict: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    service = new AuthService(
      prisma as PrismaService,
      jwt,
      config,
      usersRepository as unknown as UsersRepository,
    );
  });

  describe('login', () => {
    it('emite tokens y guarda el hash SHA-256 del refresh token', async () => {
      usersRepository.findByEmailWithCredentials.mockResolvedValue({
        ...activeUser,
        password: await bcrypt.hash('secreto', 4),
      });

      const result = await service.login({
        email: activeUser.email,
        password: 'secreto',
      });

      const access = jwt.decode(result.accessToken);
      expect(access).toMatchObject({ sub: 1, type: 'access' });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          tokenHash: hashToken(result.refreshToken),
          expiresAt: result.refreshExpiresAt,
        },
      });
      expect(result.user).not.toHaveProperty('password');
    });

    it.each([
      ['usuario inexistente', null, 'secreto'],
      ['contraseña incorrecta', 'ONLINE', 'otra'],
      ['usuario deshabilitado', 'DISABLED', 'secreto'],
    ])('rechaza con mensaje genérico: %s', async (_, status, password) => {
      usersRepository.findByEmailWithCredentials.mockResolvedValue(
        status && {
          ...activeUser,
          status,
          password: await bcrypt.hash('secreto', 4),
        },
      );

      await expect(
        service.login({ email: activeUser.email, password }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales incorrectas'));
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const signRefresh = (payload: object = { sub: 1, type: 'refresh' }) =>
      jwt.signAsync(payload, { secret: env.JWT_REFRESH_SECRET, expiresIn: '7d' });

    it('rota el token: revoca el usado y emite uno nuevo', async () => {
      const token = await signRefresh();
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 10,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await service.refresh(token);

      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: { tokenHash: hashToken(token), userId: 1 },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 10, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.refreshToken).not.toBe(token);
      expect(jwt.decode(result.accessToken)).toMatchObject({ sub: 1 });
    });

    it('ante reutilización de un token revocado cierra todas las sesiones', async () => {
      const token = await signRefresh();
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 10,
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenLastCalledWith({
        where: { userId: 1, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rechaza un access token usado como refresh token', async () => {
      const token = await jwt.signAsync(
        { sub: 1, type: 'access' },
        { secret: env.JWT_ACCESS_SECRET },
      );
      await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza un token que no está registrado en BD', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refresh(await signRefresh())).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza y revoca si el usuario fue deshabilitado', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 10,
        expiresAt: new Date(Date.now() + 60_000),
      });
      usersRepository.findById.mockResolvedValue({
        ...activeUser,
        status: 'DISABLED',
      });

      await expect(service.refresh(await signRefresh())).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revoca el refresh token por su hash', async () => {
      await service.logout('abc');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: hashToken('abc'), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
