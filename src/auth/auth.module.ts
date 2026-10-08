import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import { ModuleAccessGuard } from './module-access.guard.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    // El orden importa: primero autenticación, luego autorización por módulo.
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // Protege toda la app globalmente
    },
    {
      provide: APP_GUARD,
      useClass: ModuleAccessGuard,
    },
  ],
  imports: [JwtModule.register({}), UsersModule],
  exports: [AuthService],
})
export class AuthModule {}
