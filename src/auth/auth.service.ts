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
    console.log(loginDto);
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
        type: 'access',
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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
}
