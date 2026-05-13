/**
 * Regression tests for backendBridge normalization behavior.
 *
 * Strategy: mock global.fetch so that each normalizer is exercised through
 * the public backendBridge methods without making real HTTP requests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backendBridge } from '../../src/server/services/backendBridge.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: async () => JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// 1. normalizeSystemStatus (exercised via getDashboard)
// ---------------------------------------------------------------------------

describe('normalizeSystemStatus', () => {
  it('CRITICAL status maps to critical', async () => {
    mockFetch({ status: 'CRITICAL' });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('critical');
  });

  it('HALT status maps to critical', async () => {
    mockFetch({ status: 'HALT' });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('critical');
  });

  it('ATTENTION status maps to critical', async () => {
    mockFetch({ status: 'ATTENTION' });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('critical');
  });

  it('CAUTION status maps to degraded', async () => {
    mockFetch({ status: 'CAUTION' });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('degraded');
  });

  it('REVIEW status maps to degraded', async () => {
    mockFetch({ status: 'REVIEW' });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('degraded');
  });

  it('DEGRADED status maps to degraded', async () => {
    mockFetch({ status: 'DEGRADED' });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('degraded');
  });

  it('missing/empty status falls back to healthy', async () => {
    mockFetch({});
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('healthy');
  });

  it('ambiguous CRITICAL_REVIEW maps to critical (CRITICAL takes precedence)', async () => {
    mockFetch({ status: 'CRITICAL_REVIEW' });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('critical');
  });

  it('reads status from system_state.mode', async () => {
    mockFetch({ system_state: { mode: 'HALT' } });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('critical');
  });

  it('reads status from boundary_stress.system_state', async () => {
    mockFetch({ boundary_stress: { system_state: 'DEGRADED' } });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('degraded');
  });

  it('reads status from systemStatus field', async () => {
    mockFetch({ systemStatus: 'CAUTION' });
    const result = await backendBridge.getDashboard();
    expect(result.systemStatus).toBe('degraded');
  });
});

// ---------------------------------------------------------------------------
// 2. normalizeDashboard (exercised via getDashboard)
// ---------------------------------------------------------------------------

describe('normalizeDashboard', () => {
  it('canonical flat fields pass through unchanged', async () => {
    mockFetch({ activePolicies: 7, decisions24h: 42, boundaryAlerts: 3, status: '' });
    const result = await backendBridge.getDashboard();
    expect(result.activePolicies).toBe(7);
    expect(result.decisions24h).toBe(42);
    expect(result.boundaryAlerts).toBe(3);
  });

  it('snake_case active_policies alias maps to activePolicies', async () => {
    mockFetch({ active_policies: 5 });
    const result = await backendBridge.getDashboard();
    expect(result.activePolicies).toBe(5);
  });

  it('governance_health.total_decisions alias maps to decisions24h', async () => {
    mockFetch({ governance_health: { total_decisions: 99 } });
    const result = await backendBridge.getDashboard();
    expect(result.decisions24h).toBe(99);
  });

  it('system_state.policy_version maps activePolicies to 1', async () => {
    mockFetch({ system_state: { policy_version: 'v3' } });
    const result = await backendBridge.getDashboard();
    expect(result.activePolicies).toBe(1);
  });

  it('warning array length maps to boundaryAlerts', async () => {
    mockFetch({ boundary_stress: { warnings: ['w1', 'w2', 'w3'] } });
    const result = await backendBridge.getDashboard();
    expect(result.boundaryAlerts).toBe(3);
  });

  it('empty payload falls back safely with zero values and healthy status', async () => {
    mockFetch({});
    const result = await backendBridge.getDashboard();
    expect(result.activePolicies).toBe(0);
    expect(result.decisions24h).toBe(0);
    expect(result.boundaryAlerts).toBe(0);
    expect(result.systemStatus).toBe('healthy');
  });
});

// ---------------------------------------------------------------------------
// 3. normalizeBoundaryStress (exercised via getBoundaryStress)
// ---------------------------------------------------------------------------

describe('normalizeBoundaryStress', () => {
  it('fractional stress score in [0,1] is multiplied by 100', async () => {
    mockFetch({ stress_score: 0.75 });
    const result = await backendBridge.getBoundaryStress();
    expect(result.stressLevel).toBe(75);
  });

  it('integer stress score (>1) remains as-is', async () => {
    mockFetch({ stress_score: 42 });
    const result = await backendBridge.getBoundaryStress();
    expect(result.stressLevel).toBe(42);
  });

  it('stress score of exactly 1 is treated as fractional (→ 100)', async () => {
    mockFetch({ stress_score: 1 });
    const result = await backendBridge.getBoundaryStress();
    expect(result.stressLevel).toBe(100);
  });

  it('warnings array maps into criticalBoundaries and recommendations', async () => {
    mockFetch({ stress_score: 50, warnings: ['boundary-A exceeded', 'boundary-B exceeded'] });
    const result = await backendBridge.getBoundaryStress();
    expect(result.criticalBoundaries).toEqual(['boundary-A exceeded', 'boundary-B exceeded']);
    expect(result.recommendations).toEqual(['boundary-A exceeded', 'boundary-B exceeded']);
  });

  it('missing warnings falls back to system_state in recommendations', async () => {
    mockFetch({ stress_score: 10, system_state: 'STABLE' });
    const result = await backendBridge.getBoundaryStress();
    expect(result.criticalBoundaries).toEqual([]);
    expect(result.recommendations).toEqual(['STABLE']);
  });

  it('missing warnings with no system_state falls back to STABLE string', async () => {
    mockFetch({ stress_score: 20 });
    const result = await backendBridge.getBoundaryStress();
    expect(result.recommendations).toEqual(['STABLE']);
  });

  it('over-100 stress score violates BoundaryStressSchema (stressLevel max is 100)', async () => {
    mockFetch({ stress_score: 150 });
    await expect(backendBridge.getBoundaryStress()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. normalizePolicyDryRun (exercised via runDryRun)
// ---------------------------------------------------------------------------

const DRY_RUN_PAYLOAD = {
  policyId: 'POL-001',
  parameters: {},
  environment: 'staging' as const,
};

describe('normalizePolicyDryRun', () => {
  it('canonical fields pass through unchanged', async () => {
    mockFetch({
      status: 'OK',
      simulatedOutcome: 'No impact.',
      impactScore: 5,
      logs: ['step 1 ok'],
    });
    const result = await backendBridge.runDryRun(DRY_RUN_PAYLOAD);
    expect(result.status).toBe('OK');
    expect(result.simulatedOutcome).toBe('No impact.');
    expect(result.impactScore).toBe(5);
    expect(result.logs).toEqual(['step 1 ok']);
  });

  it('recommendation field aliases to status when status is absent', async () => {
    mockFetch({ recommendation: 'APPROVE', simulatedOutcome: 'ok', impactScore: 0, logs: [] });
    const result = await backendBridge.runDryRun(DRY_RUN_PAYLOAD);
    expect(result.status).toBe('APPROVE');
  });

  it('decisions_that_change generates simulated outcome string', async () => {
    mockFetch({ decisions_that_change: 12 });
    const result = await backendBridge.runDryRun(DRY_RUN_PAYLOAD);
    expect(result.simulatedOutcome).toBe('12 decisions would change under candidate policy.');
    expect(result.impactScore).toBe(12);
  });

  it('conflicts and risk_indicators build logs when logs absent', async () => {
    mockFetch({
      conflicts: ['conflict-A', 'conflict-B'],
      risk_indicators: ['risk-1'],
    });
    const result = await backendBridge.runDryRun(DRY_RUN_PAYLOAD);
    expect(result.logs).toContain('conflict-A');
    expect(result.logs).toContain('conflict-B');
    expect(result.logs).toContain('risk-1');
  });

  it('object conflicts are JSON-stringified in logs', async () => {
    mockFetch({
      conflicts: [{ rule: 'R1', severity: 'high' }],
      risk_indicators: [],
    });
    const result = await backendBridge.runDryRun(DRY_RUN_PAYLOAD);
    expect(result.logs[0]).toBe(JSON.stringify({ rule: 'R1', severity: 'high' }));
  });

  it('explicit logs array takes precedence over conflicts/risk_indicators', async () => {
    mockFetch({
      logs: ['explicit-log'],
      conflicts: ['ignored-conflict'],
      risk_indicators: ['ignored-risk'],
    });
    const result = await backendBridge.runDryRun(DRY_RUN_PAYLOAD);
    expect(result.logs).toEqual(['explicit-log']);
  });

  it('empty payload defaults to SIMULATED status and zero impact', async () => {
    mockFetch({});
    const result = await backendBridge.runDryRun(DRY_RUN_PAYLOAD);
    expect(result.status).toBe('SIMULATED');
    expect(result.simulatedOutcome).toBe('0 decisions would change under candidate policy.');
    expect(result.impactScore).toBe(0);
    expect(result.logs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 5. normalizeDecisionReplay (exercised via replayDecision)
// ---------------------------------------------------------------------------

describe('normalizeDecisionReplay', () => {
  it('decisionId field wins over decision_id', async () => {
    mockFetch({ decisionId: 'DEC-A', decision_id: 'DEC-B', timestamp: '', originalOutcome: 'ok', policyApplied: 'v1', context: {} });
    const result = await backendBridge.replayDecision('DEC-fallback');
    expect(result.decisionId).toBe('DEC-A');
  });

  it('decision_id wins over method parameter fallback', async () => {
    mockFetch({ decision_id: 'DEC-B', timestamp: '', originalOutcome: 'ok', policyApplied: 'v1', context: {} });
    const result = await backendBridge.replayDecision('DEC-fallback');
    expect(result.decisionId).toBe('DEC-B');
  });

  it('falls back to method decisionId parameter when response has no id fields', async () => {
    mockFetch({ timestamp: '', originalOutcome: 'ok', policyApplied: 'v1', context: {} });
    const result = await backendBridge.replayDecision('DEC-fallback');
    expect(result.decisionId).toBe('DEC-fallback');
  });

  it('timestamp alias time maps to timestamp', async () => {
    mockFetch({ time: '2025-01-01T00:00:00Z', originalOutcome: 'ok', policyApplied: 'v1', context: {} });
    const result = await backendBridge.replayDecision('DEC-001');
    expect(result.timestamp).toBe('2025-01-01T00:00:00Z');
  });

  it('timestamp alias created_at maps to timestamp', async () => {
    mockFetch({ created_at: '2025-06-15T10:00:00Z', originalOutcome: 'ok', policyApplied: 'v1', context: {} });
    const result = await backendBridge.replayDecision('DEC-001');
    expect(result.timestamp).toBe('2025-06-15T10:00:00Z');
  });

  it('context field wins over signals field', async () => {
    mockFetch({ context: { src: 'ctx' }, signals: { src: 'sig' }, timestamp: '', originalOutcome: 'ok', policyApplied: 'v1' });
    const result = await backendBridge.replayDecision('DEC-001');
    expect(result.context).toEqual({ src: 'ctx' });
  });

  it('signals field is used when context is absent', async () => {
    mockFetch({ signals: { src: 'sig' }, timestamp: '', originalOutcome: 'ok', policyApplied: 'v1' });
    const result = await backendBridge.replayDecision('DEC-001');
    expect(result.context).toEqual({ src: 'sig' });
  });

  it('raw response is used as context fallback when both context and signals are absent', async () => {
    mockFetch({ timestamp: '2025-01-01T00:00:00Z', originalOutcome: 'ok', policyApplied: 'v1' });
    const result = await backendBridge.replayDecision('DEC-001');
    // The raw object is used as context; it should contain the fields present in the response
    expect(result.context).toHaveProperty('timestamp', '2025-01-01T00:00:00Z');
  });
});
