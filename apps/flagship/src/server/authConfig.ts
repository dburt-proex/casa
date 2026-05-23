const PLACEHOLDER_SECRETS = new Set([
  'default-secret-do-not-use-in-prod',
  'your-256-bit-secret',
  'replace-with-a-long-random-secret',
]);

export type CasaRole = 'operator' | 'admin';

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function getJwtSecretBytes() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || PLACEHOLDER_SECRETS.has(secret)) {
    if (isProduction()) {
      throw new Error('JWT_SECRET must be configured with a non-placeholder value in production');
    }
    return new TextEncoder().encode('dev-only-casa-jwt-secret');
  }

  return new TextEncoder().encode(secret);
}

export function isDevLoginEnabled() {
  if (isProduction()) {
    return false;
  }
  return process.env.ENABLE_DEV_LOGIN !== 'false';
}

export function isClerkConfigured() {
  return !!process.env.CLERK_SECRET_KEY?.trim();
}

export function getClerkSecretKey() {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    if (isProduction()) {
      throw new Error('CLERK_SECRET_KEY must be configured in production');
    }
    return null;
  }
  return secretKey;
}

export function normalizeCasaRole(role: unknown): CasaRole {
  return role === 'admin' ? 'admin' : 'operator';
}

export function redactSecret(value?: string) {
  if (!value) return null;
  if (value.length <= 8) return 'configured';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
