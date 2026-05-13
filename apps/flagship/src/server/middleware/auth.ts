import { Request, Response, NextFunction } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { jwtVerify } from 'jose';
import {
  CasaRole,
  getClerkSecretKey,
  getJwtSecretBytes,
  isClerkConfigured,
  isProduction,
  normalizeCasaRole,
} from '../authConfig.js';

const JWT_SECRET = getJwtSecretBytes();

export type AuthenticatedUser = {
  sub: string;
  email?: string;
  role: CasaRole;
  provider: 'clerk' | 'dev';
};

let clerkClient: ReturnType<typeof createClerkClient> | null = null;

function getBearerToken(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1];
}

function getConfiguredClerkClient() {
  const secretKey = getClerkSecretKey();
  if (!secretKey) return null;
  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey });
  }
  return clerkClient;
}

async function authenticateClerkToken(token: string): Promise<AuthenticatedUser> {
  const secretKey = getClerkSecretKey();
  if (!secretKey) {
    throw new Error('Clerk is not configured');
  }

  const payload = await verifyToken(token, { secretKey });
  const userId = String(payload.sub);
  const user = await getConfiguredClerkClient()?.users.getUser(userId);
  const metadata = user as any;
  const role = normalizeCasaRole(
    metadata?.privateMetadata?.role ??
    metadata?.publicMetadata?.role ??
    (payload as any).role
  );

  return {
    sub: userId,
    email: user?.primaryEmailAddress?.emailAddress,
    role,
    provider: 'clerk',
  };
}

async function authenticateDevToken(token: string): Promise<AuthenticatedUser> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return {
    sub: String(payload.sub || payload.email || 'dev-user'),
    email: typeof payload.email === 'string' ? payload.email : undefined,
    role: normalizeCasaRole(payload.role),
    provider: 'dev',
  };
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
  }

  try {
    if (isClerkConfigured()) {
      (req as any).user = await authenticateClerkToken(token);
    } else {
      if (isProduction()) {
        return res.status(503).json({ error: 'Service unavailable', message: 'Clerk authentication is not configured' });
      }
      (req as any).user = await authenticateDevToken(token);
    }
    next();
  } catch (err: any) {
    if (err.name === 'JWTExpired' || err.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token expired' });
    }
    console.error('[Auth Error] Token verification failed:', err);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}
