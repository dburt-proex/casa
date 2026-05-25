import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
let tempDir = '';
let server: http.Server | null = null;
let baseUrl = '';

async function startTestServer() {
  vi.resetModules();
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

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'casa-sprint-routes-'));
  process.env = { ...originalEnv };
  process.env.NODE_ENV = 'development';
  process.env.ENABLE_DEV_LOGIN = 'true';
  process.env.JWT_SECRET = 'route-test-jwt-secret';
  process.env.GOVERNANCE_SPRINT_STORE_PATH = path.join(tempDir, 'governance-sprints.json');
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.DATABASE_URL;
  await startTestServer();
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => server?.close((error) => error ? reject(error) : resolve()));
    server = null;
  }
  process.env = { ...originalEnv };
  vi.resetModules();
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

describe('governance sprint routes', () => {
  it('lets an operator request and read a sprint but not update it', async () => {
    const token = await login('operator');
    const auth = { Authorization: `Bearer ${token}` };

    const created = await jsonRequest('/governance-sprints', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        decisionId: 'dec-route-operator',
        workflowSummary: 'Customer-facing email workflow',
        decisionSnapshot: { decision: 'REVIEW' },
      }),
    });

    expect(created.response.status).toBe(201);
    expect(created.body.status).toBe('REQUESTED');

    const listed = await jsonRequest('/governance-sprints', { headers: auth });
    expect(listed.response.status).toBe(200);
    expect(listed.body).toHaveLength(1);

    const patched = await jsonRequest(`/governance-sprints/${created.body.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    expect(patched.response.status).toBe(403);
  });

  it('lets an admin create and update sprint controls', async () => {
    const token = await login('admin');
    const auth = { Authorization: `Bearer ${token}` };

    const created = await jsonRequest('/governance-sprints', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        decisionId: 'dec-route-admin',
        workflowSummary: 'Refund review workflow',
        decisionSnapshot: { decision: 'REVIEW' },
        durationDays: 14,
      }),
    });

    expect(created.response.status).toBe(201);
    expect(created.body.status).toBe('ACTIVE');

    const patched = await jsonRequest(`/governance-sprints/${created.body.id}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        phase: 'Controls',
        owner: 'admin@example.com',
        notes: 'Client sprint activated.',
      }),
    });

    expect(patched.response.status).toBe(200);
    expect(patched.body.phase).toBe('Controls');
    expect(patched.body.owner).toBe('admin@example.com');
  });

  it('rejects malformed sprint creation payloads', async () => {
    const token = await login('admin');
    const created = await jsonRequest('/governance-sprints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        workflowSummary: 'Missing decision ID',
      }),
    });

    expect(created.response.status).toBe(400);
    expect(created.body.error).toBe('Invalid governance sprint request');
  });
});
