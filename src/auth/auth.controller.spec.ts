import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

describe('AuthController', () => {
  const expires = new Date('2026-10-15T00:00:00Z');
  let authService: Record<string, ReturnType<typeof vi.fn>>;
  let response: { cookie: ReturnType<typeof vi.fn>; clearCookie: ReturnType<typeof vi.fn> };
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      login: vi.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        refreshExpiresAt: expires,
      }),
      refresh: vi.fn().mockResolvedValue({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        refreshExpiresAt: expires,
      }),
      logout: vi.fn(),
    };
    response = { cookie: vi.fn(), clearCookie: vi.fn() };
    controller = new AuthController(authService as unknown as AuthService);
  });

  const req = (cookies: Record<string, string> = {}) =>
    ({ cookies }) as unknown as Request;

  it('login devuelve el access token y deja el refresh token solo en una cookie HttpOnly', async () => {
    const body = await controller.login(
      { email: 'a@b.pe', password: 'x' },
      response as unknown as Response,
    );

    expect(body).toEqual({ accessToken: 'access' });
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh',
      expect.objectContaining({ httpOnly: true, path: '/auth', expires }),
    );
  });

  it('refresh usa la cookie y la reemplaza por el nuevo token', async () => {
    const body = await controller.refresh(
      req({ refresh_token: 'refresh' }),
      response as unknown as Response,
    );

    expect(authService.refresh).toHaveBeenCalledWith('refresh');
    expect(body).toEqual({ accessToken: 'access-2' });
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-2',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('refresh sin cookie responde 401', async () => {
    await expect(
      controller.refresh(req(), response as unknown as Response),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refresh fallido borra la cookie', async () => {
    authService.refresh.mockRejectedValue(new UnauthorizedException());
    await expect(
      controller.refresh(req({ refresh_token: 'x' }), response as unknown as Response),
    ).rejects.toThrow(UnauthorizedException);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/auth' }),
    );
  });

  it('logout revoca el token y borra la cookie', async () => {
    await controller.logout(
      req({ refresh_token: 'refresh' }),
      response as unknown as Response,
    );
    expect(authService.logout).toHaveBeenCalledWith('refresh');
    expect(response.clearCookie).toHaveBeenCalled();
  });
});
