import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ClubMember } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { requireSecret } from 'src/auth/jwtSecrets';

/**
 * Members sign in to the Monk Club app with their own tokens. They're signed
 * with a key derived from JWT_SECRET, so a member token is never accepted by
 * the staff API, and a staff token is never accepted here.
 */
export const clubSecret = () => `${requireSecret(undefined, 'JWT_SECRET')}:monk-club-member`;
export const CLUB_AUDIENCE = 'pbms-monk-club';
export const CLUB_TOKEN_TTL = '7d';

export type ClubTokenPayload = { sub: number; v: number; aud: string };

const ALLOW_BEFORE_PASSWORD_CHANGE = 'clubAllowBeforePasswordChange';
/** Routes a member may use before replacing the temporary password. */
export const AllowBeforePasswordChange = () => SetMetadata(ALLOW_BEFORE_PASSWORD_CHANGE, true);

/** The signed-in member (set by ClubAuthGuard). */
export const CurrentMember = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().clubMember as ClubMember);

// Short cache so a page that makes five calls does one lookup.
const cache = new Map<number, { at: number; member: ClubMember }>();
export const forgetMember = (id: number) => cache.delete(id);

@Injectable()
export class ClubAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header = String(req.headers.authorization ?? '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Please sign in');

    let payload: ClubTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<ClubTokenPayload>(token, { secret: clubSecret(), audience: CLUB_AUDIENCE });
    } catch {
      throw new UnauthorizedException('Your session has ended. Please sign in again.');
    }

    const hit = cache.get(payload.sub);
    let member = hit && Date.now() - hit.at < 15_000 ? hit.member : null;
    if (!member) {
      member = await this.prisma.clubMember.findUnique({ where: { id: payload.sub } });
      if (member) cache.set(member.id, { at: Date.now(), member });
    }
    if (!member || member.tokenVersion !== payload.v) throw new UnauthorizedException('Your session has ended. Please sign in again.');
    if (!['AWAITING_PAYMENT', 'ACTIVE'].includes(member.status)) {
      throw new ForbiddenException(member.status === 'SUSPENDED' ? 'Your membership is suspended. Please contact Prof Bioresearch.' : 'This account cannot sign in.');
    }

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_BEFORE_PASSWORD_CHANGE, [ctx.getHandler(), ctx.getClass()]);
    if (member.mustChangePassword && !allowed) throw new ForbiddenException('Please set a new password first.');

    req.clubMember = member;
    return true;
  }
}
