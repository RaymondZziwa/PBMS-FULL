import type { ConfigService } from '@nestjs/config';

/**
 * Signing keys must come from the environment. The old code fell back to the
 * public strings 'fallback-secret' / 'fallback-refresh-secret', which would let
 * anyone forge a login if the variable was ever missing. Now the API refuses to start.
 */
export const requireSecret = (
  config: ConfigService | undefined,
  key: 'JWT_SECRET' | 'JWT_REFRESH_SECRET',
): string => {
  const value = config?.get<string>(key) ?? process.env[key];
  if (!value || value.length < 32) {
    throw new Error(
      `${key} is missing or shorter than 32 characters. Set a long random value in .env ` +
        `(for example: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))").`,
    );
  }
  return value;
};
