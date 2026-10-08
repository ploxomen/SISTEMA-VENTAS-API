// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ActiveUser {
  sub: number;
  email: string;
  firstName?: string;
  lastName?: string;
  type?: 'access' | 'refresh';
}

export const CurrentUser = createParamDecorator(
  (data: keyof ActiveUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ActiveUser;

    return data ? user?.[data] : user;
  },
);