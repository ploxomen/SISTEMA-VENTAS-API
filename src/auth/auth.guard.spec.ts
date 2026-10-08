import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard.js';

describe('AuthGuard', () => {
  const jwt = new JwtService({});
  const config = {
    getOrThrow: () => 'access-secret',
  } as unknown as ConfigService;
  const guard = new AuthGuard(jwt, config, new Reflector());

  const contextWith = (authorization?: string) => {
    const request: Record<string, any> = { headers: { authorization } };
    const context = {
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  it('acepta un access token válido y adjunta el payload', async () => {
    const token = await jwt.signAsync(
      { sub: 1, type: 'access' },
      { secret: 'access-secret' },
    );
    const { context, request } = contextWith(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: 1 });
  });

  it('rechaza solicitudes sin token', async () => {
    await expect(guard.canActivate(contextWith().context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un refresh token enviado como access token', async () => {
    const token = await jwt.signAsync(
      { sub: 1, type: 'refresh' },
      { secret: 'access-secret' },
    );
    await expect(
      guard.canActivate(contextWith(`Bearer ${token}`).context),
    ).rejects.toThrow(UnauthorizedException);
  });
});
