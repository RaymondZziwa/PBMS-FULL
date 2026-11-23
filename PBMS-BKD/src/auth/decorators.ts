import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './permissions';

export const PERMISSIONS_KEY = 'requiredPermissions';
export const IS_PUBLIC_KEY = 'isPublicRoute';

/**
 * Every route needs a signed-in user unless it is marked @Public()
 * (login, password reset, payment-provider callbacks...). See GlobalAuthGuard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Any signed-in user, even when the controller requires a permission. */
export const SignedIn = () => SetMetadata(PERMISSIONS_KEY, []);

/**
 * The signed-in user must hold at least one of these permissions.
 * The guards are global (app.module.ts), so this is all a route needs:
 *
 *   @RequirePermissions(PERMISSIONS.REPORTS)
 *   @Get('metrics')
 *   getMetrics() { ... }
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** The signed-in user, as set by JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as unknown as AuthenticatedUser;
  },
);
