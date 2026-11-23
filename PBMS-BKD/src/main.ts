import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { requireSecret } from './auth/jwtSecrets';

/** Origins allowed to call the API with cookies. Localhost only outside production. */
const PRODUCTION_ORIGINS = [
  'https://kingserp.netlify.app',
  'https://pbms.megaerpug.com',
  'https://pbdp.megaerpug.com',
];
/** The Monk Club member app, e.g. CLUB_APP_ORIGINS=https://club.profbioresearch.net (comma-separated). */
const CLUB_ORIGINS = (process.env.CLUB_APP_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const DEV_ORIGINS = [
  'http://localhost:5175',
  'http://localhost:5173',
  'http://localhost:5170',
  'http://localhost:8080',
  'http://localhost:8081',
];

/**
 * Small in-memory limiter for the sign-in and password-reset routes, so nobody
 * can guess passwords or reset codes at speed. Per IP and route.
 */
const LIMITED_ROUTES: Array<{ match: RegExp; max: number; windowMs: number }> = [
  { match: /^\/api\/auth\/(pbd\/)?login$/, max: 10, windowMs: 15 * 60_000 },
  { match: /^\/api\/auth\/forgot-password/, max: 8, windowMs: 15 * 60_000 },
  { match: /^\/api\/club\/auth\/login$/, max: 10, windowMs: 15 * 60_000 },
  { match: /^\/api\/club\/register$/, max: 5, windowMs: 60 * 60_000 },
  { match: /^\/api\/club\/verify/, max: 60, windowMs: 15 * 60_000 },
];
const hits = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, hit] of hits) if (hit.resetAt < now) hits.delete(key);
}, 60_000).unref();

const rateLimit = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST') return next();
  const rule = LIMITED_ROUTES.find((r) => r.match.test(req.path));
  if (!rule) return next();
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const hit = hits.get(key);
  if (!hit || hit.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + rule.windowMs });
    return next();
  }
  hit.count += 1;
  if (hit.count > rule.max) {
    res.setHeader('Retry-After', Math.ceil((hit.resetAt - now) / 1000));
    return res.status(429).json({
      statusCode: 429,
      message: 'Too many attempts. Please wait a few minutes and try again.',
    });
  }
  return next();
};

/** Basic security headers (what helmet would set for a JSON API). */
const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
};

async function bootstrap() {
  // Fail fast if the signing keys are missing or weak.
  requireSecret(undefined, 'JWT_SECRET');
  requireSecret(undefined, 'JWT_REFRESH_SECRET');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.disable('x-powered-by');
  // Behind nginx/PM2: use the client's real IP for rate limiting.
  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(rateLimit);
  app.use(cookieParser());
  // Close DB connections cleanly when PM2 restarts/stops the process
  app.enableShutdownHooks();

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production'
        ? [...PRODUCTION_ORIGINS, ...CLUB_ORIGINS]
        : [...PRODUCTION_ORIGINS, ...CLUB_ORIGINS, ...DEV_ORIGINS],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
  });

  await app.listen(3500);
}
bootstrap();
