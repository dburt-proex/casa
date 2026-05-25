import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GovernanceSprintStore } from '../../src/server/services/governanceSprintStore.js';
import type { AuthenticatedUser } from '../../src/server/middleware/auth.js';

const originalEnv = { ...process.env };
let tempDir = '';

const operator: AuthenticatedUser = {
  sub: 'operator-1',
  email: 'operator@example.com',
  role: 'operator',
  provider: 'dev',
};

const admin: AuthenticatedUser = {
  sub: 'admin-1',
  email: 'admin@example.com',
  role: 'admin',
  provider: 'dev',
};

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'casa-sprints-'));
  process.env = { ...originalEnv };
  process.env.NODE_ENV = 'development';
  delete process.env.DATABASE_URL;
  process.env.GOVERNANCE_SPRINT_STORE_PATH = path.join(tempDir, 'governance-sprints.json');
});

afterEach(async () => {
  process.env = { ...originalEnv };
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

describe('GovernanceSprintStore', () => {
  it('creates operator-requested sprints with local development fallback', async () => {
    const store = new GovernanceSprintStore();
    const { sprint, created } = await store.createOrGet({
      decisionId: 'dec-review-1',
      workflowSummary: 'Customer email workflow',
      decisionSnapshot: { decision: 'REVIEW', reason: 'Human review required.' },
      durationDays: 7,
      source: 'workflow_intake',
    }, operator);

    expect(created).toBe(true);
    expect(sprint.status).toBe('REQUESTED');
    expect(sprint.phase).toBe('Intake');
    expect(sprint.owner).toBeNull();
    expect(sprint.checklist.length).toBeGreaterThan(3);
    expect(sprint.evidence[0].value).toBe('dec-review-1');
  });

  it('starts admin-created sprints as active and returns existing sprint for duplicate decisions', async () => {
    const store = new GovernanceSprintStore();
    const payload = {
      decisionId: 'dec-review-2',
      workflowSummary: 'Refund approval workflow',
      decisionSnapshot: { decision: 'REVIEW' },
      durationDays: 14 as const,
      source: 'review_gate' as const,
    };

    const first = await store.createOrGet(payload, admin);
    const duplicate = await store.createOrGet(payload, operator);

    expect(first.created).toBe(true);
    expect(first.sprint.status).toBe('ACTIVE');
    expect(first.sprint.owner).toBe('admin@example.com');
    expect(duplicate.created).toBe(false);
    expect(duplicate.sprint.id).toBe(first.sprint.id);
  });

  it('updates sprint controls', async () => {
    const store = new GovernanceSprintStore();
    const { sprint } = await store.createOrGet({
      decisionId: 'dec-review-3',
      workflowSummary: 'Data cleanup workflow',
      decisionSnapshot: { decision: 'HALT' },
      durationDays: 7,
      source: 'manual',
    }, admin);

    const updated = await store.update(sprint.id, {
      phase: 'Controls',
      status: 'ACTIVE',
      owner: 'ops-lead@example.com',
      notes: 'Controls mapped for client walkthrough.',
      checklist: sprint.checklist.map((item, index) => index === 0 ? { ...item, complete: true } : item),
    });

    expect(updated?.phase).toBe('Controls');
    expect(updated?.owner).toBe('ops-lead@example.com');
    expect(updated?.notes).toContain('Controls mapped');
    expect(updated?.checklist[0].complete).toBe(true);
  });

  it('requires durable storage in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_URL;

    const store = new GovernanceSprintStore();
    await expect(store.list()).rejects.toThrow(/DATABASE_URL is required/);
  });
});
