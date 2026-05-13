/**
 * Unit tests for the `authenticate` middleware (src/server/middleware/auth.ts).
 *
 * Strategy: mock jose's jwtVerify so that we can simulate valid tokens,
 * expired tokens, and completely invalid tokens without running a real JWT stack.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module under test is imported
// ---------------------------------------------------------------------------

vi.mock('jose', () => ({
  jwtVerify: vi.fn(),
}));

vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn(),
  verifyToken: vi.fn(),
}));

import { jwtVerify } from 'jose';
import { authenticate } from '../../src/server/middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json } as unknown as Response & { status: typeof status; json: typeof json };
}

const next: NextFunction = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CLERK_SECRET_KEY;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('authenticate middleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const req = makeReq({});
    const res = makeRes();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with "Bearer "', async () => {
    const req = makeReq({ authorization: 'Basic dXNlcjpwYXNz' });
    const res = makeRes();
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and attaches payload on a valid token', async () => {
    const mockPayload = { sub: 'user-1', role: 'operator' };
    vi.mocked(jwtVerify).mockResolvedValueOnce({ payload: mockPayload } as any);

    const req = makeReq({ authorization: 'Bearer valid-token' });
    const res = makeRes();
    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as any).user).toEqual({
      sub: 'user-1',
      role: 'operator',
      provider: 'dev',
      email: undefined,
    });
  });

  it('returns 401 with "Token expired" message on JWTExpired error', async () => {
    const expiredError = Object.assign(new Error('JWT expired'), { name: 'JWTExpired' });
    vi.mocked(jwtVerify).mockRejectedValueOnce(expiredError);

    const req = makeReq({ authorization: 'Bearer expired-token' });
    const res = makeRes();
    const jsonSpy = vi.fn();
    (res.status as any).mockReturnValue({ json: jsonSpy });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token expired' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with "Token expired" message on ERR_JWT_EXPIRED code', async () => {
    const expiredError = Object.assign(new Error('JWT expired'), { code: 'ERR_JWT_EXPIRED' });
    vi.mocked(jwtVerify).mockRejectedValueOnce(expiredError);

    const req = makeReq({ authorization: 'Bearer expired-token-2' });
    const res = makeRes();
    const jsonSpy = vi.fn();
    (res.status as any).mockReturnValue({ json: jsonSpy });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token expired' })
    );
  });

  it('returns 401 with "Invalid or expired token" message on a generic JWT error', async () => {
    vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('signature mismatch'));

    const req = makeReq({ authorization: 'Bearer tampered-token' });
    const res = makeRes();
    const jsonSpy = vi.fn();
    (res.status as any).mockReturnValue({ json: jsonSpy });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid or expired token' })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
