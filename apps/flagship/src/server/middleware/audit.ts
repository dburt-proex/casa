import { Request, Response, NextFunction } from 'express';
import { authenticate, AuthenticatedUser } from './auth.js';
import { auditLogger } from '../services/auditLogger.js';

function requireAuthenticatedUser(req: Request): AuthenticatedUser | null {
  return ((req as any).user || null) as AuthenticatedUser | null;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await authenticate(req, res, () => {
    const user = requireAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing authenticated user' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin role required' });
    }

    next();
  });
}

export async function requireAdminConfirmation(req: Request, res: Response, next: NextFunction) {
  await authenticate(req, res, async () => {
    const { confirmationCode, policyId } = req.body;
    const user = requireAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing authenticated user' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin role required' });
    }

    if (!confirmationCode || confirmationCode !== `APPLY-${policyId}`) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Explicit admin confirmation required. Expected: APPLY-${policyId}`,
      });
    }

    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'POLICY_MUTATION',
      policyId,
      actorIdentity: user.sub || user.email || 'unknown-admin',
      actorEmail: user.email,
      actorRole: user.role,
      provider: user.provider,
      ip: req.ip,
      reason: req.body.reason || 'No reason provided',
      requestId: req.headers['x-request-id'],
    };

    try {
      await auditLogger.record(auditEntry);
    } catch (error) {
      console.error('[AUDIT LOG FAILED] Rejecting write action.', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to durably log audit event. Action rejected.',
      });
    }

    next();
  });
}
