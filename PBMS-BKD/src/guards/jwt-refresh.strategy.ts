// src/auth/strategies/jwt-refresh.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';
import type { Request } from 'express';
import { requireSecret } from 'src/auth/jwtSecrets';

type JwtRefreshPayload = {
  sub: number;
  email?: string;
  lastName?: string;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Check cookies for refresh token
          let token: string | null = request.cookies?.refreshToken ?? null;

          // Fallback to Authorization header
          if (!token && request.headers.authorization) {
            const authHeader = request.headers.authorization;
            if (authHeader.startsWith('Refresh ')) {
              token = authHeader.replace('Refresh ', '');
            }
          }

          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        requireSecret(configService, 'JWT_REFRESH_SECRET'),
    });
  }

  async validate(payload: JwtRefreshPayload) {
    const rawUserId = payload?.sub;
    const userId =
      typeof rawUserId === 'number'
        ? rawUserId
        : typeof rawUserId === 'string'
          ? Number(rawUserId)
          : NaN;

    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.authService.validateUser(userId);

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }
}
