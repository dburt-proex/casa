import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const mockBackendBridge = {
  reviewDecision: vi.fn(),
  runDryRun: vi.fn(),
  applyPolicy: vi.fn(),
};

const mockAuditRecord = vi.fn();

let server: http.Server | null = null;
let baseUrl = '';

async function startTestServer(options: { nodeEnv?: string; enableDevLogin?: string } = {}) {
  const { nodeEnv = 'development', enableDevLogin = 'true' } = options;

  vi.resetModules();
  vi.clearAllMocks();

  process.env = {
    ...originalEnv,
    NODE_ENV: nodeEnv,
    ENABLE_DEV_LOGIN: enableDevLogin,
    JWT_SECRET: 'route-test-jwt-secret',
  };

  delete process.env.CLERK_SECRET_KEY;

  mockBackendBridge.reviewDecision.mockResolvedValue({ status: 'APPROVED' });
  mockBackendBridge.runDryRun.mockResolvedValue({ status: 'SIMULATED', environment: 'staging' });
  mockBackendBridge.applyPolicy.mockRejectedValue(
    new Error('Canonical CASA governance API does not yet expose admin policy apply. Add this endpoint in casa-control-plane before enabling policy mutation from CASA-Flagship.')
  );
  mockAuditRecord.mockResolvedValue(undefined);

  vi.doMock('../../src/server/services/backendBridge.js', () => ({
    backendBridge: {
      evaluateAction: vi.fn(),
      getDashboard: vi.fn(),
      getBoundaryStress: vi.fn(),
      replayDecision: vi.fn(),
      getFlaggedDecisions: vi.fn(),
      getDecisionHistory: vi.fn(),
      reviewDecision: mockBackendBridge.reviewDecision,
      runDryRun: mockBackendBridge.runDryRun,
      applyPolicy: mockBackendBridge.applyPolicy,
    },
    getBackendBridgeConfigStatus: () => ({
      backendConfigured: true,
      backendUrlValid: true,
    }),
  }));

  vi.doMock('../../src/server/services/auditLogger.js', () => ({
    auditLogger: {
      record: mockAuditRecord,
    },
  }));

  vi.doMock('../../src/server/services/gemini.js', () => ({
    geminiService: {
      getConfigStatus: () => ({
        geminiConfigured: false,
        canonicalGeminiConfigured: false,
        legacyGeminiConfigured: false,
      }),
      handleChat: vi.fn(),
      explainData: vi.fn(),
      analyzePolicy: vi.fn(),
    },
  }));

  const { apiRouter } = await import('../../src/server/routes/api.js');

  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);

  server = await new Promise<http.Server>((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}/api`;
}

async function jsonRequest(pathname: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function login(role: 'operator' | 'admin') {
  const { body } = await jsonRequest('/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ role, email: `${role}@example.com` }),
  });
  return body.token as string;
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
    server = null;
  }
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('api reliability routes', () => {
  it('disables dev login at the route level in production', async () => {
    await startTestServer({ nodeEnv: 'production', enableDevLogin: 'true' });

    const result = await jsonRequest('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ role: 'admin', email: 'admin@example.com' }),
    });

    expect(result.response.status).toBe(404);
    expect(result.body).toEqual({ error: 'Not found' });
  });

  it('rejects review writes from non-admin users', async () => {
    await startTestServer();
    const token = await login('operator');
    const auth = { Authorization: 'Bearer ' + token };

    const result = await jsonRequest('/decisions/DEC-1/review', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ action: 'APPROVE', notes: 'looks good' }),
    });

    expect(result.response.status).toBe(403);
    expect(mockBackendBridge.reviewDecision).not.toHaveBeenCalled();
  });

  it('allows admins to submit review writes', async () => {
    await startTestServer();
    const token = await login('admin');
    const auth = { Authorization: 'Bearer ' + token };

    const result = await jsonRequest('/decisions/DEC-1/review', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ action: 'APPROVE', notes: 'looks good' }),
    });

    expect(result.response.status).toBe(200);
    expect(mockBackendBridge.reviewDecision).toHaveBeenCalledWith('DEC-1', 'APPROVE', 'admin@example.com', 'looks good', undefined);
  });

  it('rejects policy dry-runs from non-admin users', async () => {
    await startTestServer();
    const token = await login('operator');
    const auth = { Authorization: 'Bearer ' + token };

    const result = await jsonRequest('/policy/dryrun', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        policyId: 'POL-102',
        environment: 'staging',
        parameters: { policy_candidate_path: 'policy-candidates/POL-102-data-egress-boundary.json' },
      }),
    });

    expect(result.response.status).toBe(403);
    expect(mockBackendBridge.runDryRun).not.toHaveBeenCalled();
  });

  it('allows admins to run policy dry-runs', async () => {
    await startTestServer();
    const token = await login('admin');
    const auth = { Authorization: 'Bearer ' + token };

    const result = await jsonRequest('/policy/dryrun', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        policyId: 'POL-102',
        environment: 'staging',
        parameters: { policy_candidate_path: 'policy-candidates/POL-102-data-egress-boundary.json' },
      }),
    });

    expect(result.response.status).toBe(200);
    expect(mockBackendBridge.runDryRun).toHaveBeenCalledWith(
      {
        policyId: 'POL-102',
        environment: 'staging',
        parameters: { policy_candidate_path: 'policy-candidates/POL-102-data-egress-boundary.json' },
      },
      undefined
    );
  });

  it('returns 501 when policy apply remains unavailable', async () => {
    await startTestServer();
    const token = await login('admin');
    const auth = { Authorization: 'Bearer ' + token };

    const result = await jsonRequest('/admin/policy/apply', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        policyId: 'POL-102',
        confirmationCode: 'APPLY-POL-102',
        reason: 'planned rollout',
      }),
    });

    expect(result.response.status).toBe(501);
    expect(mockAuditRecord).toHaveBeenCalledOnce();
    expect(mockBackendBridge.applyPolicy).toHaveBeenCalledWith('POL-102', 'planned rollout', undefined);
  });

  it('fails closed before admin writes when durable audit logging is unavailable', async () => {
    await startTestServer();
    mockAuditRecord.mockRejectedValueOnce(new Error('audit unavailable'));
    const token = await login('admin');
    const auth = { Authorization: 'Bearer ' + token };

    const result = await jsonRequest('/admin/policy/apply', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        policyId: 'POL-102',
        confirmationCode: 'APPLY-POL-102',
        reason: 'planned rollout',
      }),
    });

    expect(result.response.status).toBe(500);
    expect(mockBackendBridge.applyPolicy).not.toHaveBeenCalled();
  });
});
