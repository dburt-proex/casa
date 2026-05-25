import { afterEach, describe, expect, it } from 'vitest';
import { AuditLogger } from '../../src/server/services/auditLogger.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('AuditLogger', () => {
  it('fails closed in production when DATABASE_URL is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;

    const auditLogger = new AuditLogger();

    await expect(auditLogger.record({
      timestamp: new Date().toISOString(),
      action: 'POLICY_MUTATION',
      policyId: 'POL-102',
      actorIdentity: 'admin@example.com',
    })).rejects.toThrow(/DATABASE_URL is required/);
  });
});
