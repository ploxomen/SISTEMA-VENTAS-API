import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { CookieOptions, Request, Response } from 'express';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

const REFRESH_COOKIE = 'refresh_token';
const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  // La cookie solo viaja a los endpoints de autenticación.
  path: '/auth',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token: string | undefined = request.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Sesión no válida');
    }
    try {
      const result = await this.authService.refresh(token);
      this.setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
      return { accessToken: result.accessToken };
    } catch (error) {
      response.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
      throw error;
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.cookies?.[REFRESH_COOKIE]);
    response.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  }

  @Get('my-rol')
  async roles(@CurrentUser('sub') userId: number) {

  }

  private setRefreshCookie(response: Response, token: string, expires: Date) {
    response.cookie(REFRESH_COOKIE, token, { ...refreshCookieOptions, expires });
  }
}
