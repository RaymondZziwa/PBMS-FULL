import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from 'src/auth/decorators';
import { hasPermission, type AuthenticatedUser } from 'src/auth/permissions';

/**
 * Checks @RequirePermissions() on the route (or its controller).
 * Registered globally after GlobalAuthGuard (app.module.ts).
 * Routes without @RequirePermissions only need a signed-in user; @Public() routes skip it.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as unknown as AuthenticatedUser | undefined;
    if (!user) throw new UnauthorizedException('Please sign in');

    if (!required || required.length === 0) return true;
    if (required.some((permission) => hasPermission(user, permission))) {
      return true;
    }

    throw new ForbiddenException("You don't have access to this");
  }
}
