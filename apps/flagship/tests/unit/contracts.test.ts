/**
 * Unit tests for Zod schema contracts defined in src/server/schemas/contracts.ts.
 *
 * Tests cover: valid payloads, invalid types, missing required fields,
 * enum constraints, and max-length string bounds.
 */
import { describe, it, expect } from 'vitest';
import {
  DashboardSchema,
  BoundaryStressSchema,
  PolicyDryRunRequestSchema,
  PolicyDryRunResponseSchema,
  DecisionReplaySchema,
  ChatRequestSchema,
  AdminApplyPolicySchema,
} from '../../src/server/schemas/contracts.js';

// ---------------------------------------------------------------------------
// DashboardSchema
// ---------------------------------------------------------------------------

describe('DashboardSchema', () => {
  const valid = {
    activePolicies: 3,
    decisions24h: 100,
    boundaryAlerts: 2,
    systemStatus: 'healthy' as const,
  };

  it('accepts a fully valid payload', () => {
    expect(() => DashboardSchema.parse(valid)).not.toThrow();
  });

  it('accepts all valid systemStatus enum values', () => {
    for (const status of ['healthy', 'degraded', 'critical'] as const) {
      expect(() => DashboardSchema.parse({ ...valid, systemStatus: status })).not.toThrow();
    }
  });

  it('rejects an unknown systemStatus value', () => {
    expect(() => DashboardSchema.parse({ ...valid, systemStatus: 'unknown' })).toThrow();
  });

  it('rejects non-numeric activePolicies', () => {
    expect(() => DashboardSchema.parse({ ...valid, activePolicies: 'three' })).toThrow();
  });

  it('rejects missing required field decisions24h', () => {
    const { decisions24h: _, ...rest } = valid;
    expect(() => DashboardSchema.parse(rest)).toThrow();
  });

  it('does not enforce non-negative for boundaryAlerts (no min constraint in schema)', () => {
    // The current DashboardSchema.boundaryAlerts uses z.number() without a min()
    // constraint, so negative values pass.  This test documents the current
    // schema behavior.  If a non-negative constraint is ever added, update both
    // the schema and this test.
    const result = DashboardSchema.parse({ ...valid, boundaryAlerts: -1 });
    expect(result.boundaryAlerts).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// BoundaryStressSchema
// ---------------------------------------------------------------------------

describe('BoundaryStressSchema', () => {
  const valid = {
    stressLevel: 50,
    criticalBoundaries: ['boundary-A'],
    recommendations: ['Reduce throughput'],
  };

  it('accepts a fully valid payload', () => {
    expect(() => BoundaryStressSchema.parse(valid)).not.toThrow();
  });

  it('accepts stressLevel at min boundary (0)', () => {
    expect(() => BoundaryStressSchema.parse({ ...valid, stressLevel: 0 })).not.toThrow();
  });

  it('accepts stressLevel at max boundary (100)', () => {
    expect(() => BoundaryStressSchema.parse({ ...valid, stressLevel: 100 })).not.toThrow();
  });

  it('rejects stressLevel above 100', () => {
    expect(() => BoundaryStressSchema.parse({ ...valid, stressLevel: 101 })).toThrow();
  });

  it('rejects stressLevel below 0', () => {
    expect(() => BoundaryStressSchema.parse({ ...valid, stressLevel: -1 })).toThrow();
  });

  it('rejects a criticalBoundaries string exceeding 200 chars', () => {
    const longString = 'x'.repeat(201);
    expect(() => BoundaryStressSchema.parse({ ...valid, criticalBoundaries: [longString] })).toThrow();
  });

  it('rejects a recommendation string exceeding 500 chars', () => {
    const longString = 'r'.repeat(501);
    expect(() => BoundaryStressSchema.parse({ ...valid, recommendations: [longString] })).toThrow();
  });

  it('accepts empty arrays for criticalBoundaries and recommendations', () => {
    expect(() => BoundaryStressSchema.parse({ ...valid, criticalBoundaries: [], recommendations: [] })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// PolicyDryRunRequestSchema
// ---------------------------------------------------------------------------

describe('PolicyDryRunRequestSchema', () => {
  const valid = {
    policyId: 'POL-001',
    parameters: {},
    environment: 'staging' as const,
  };

  it('accepts a valid staging request', () => {
    expect(() => PolicyDryRunRequestSchema.parse(valid)).not.toThrow();
  });

  it('accepts environment = production', () => {
    expect(() => PolicyDryRunRequestSchema.parse({ ...valid, environment: 'production' })).not.toThrow();
  });

  it('defaults environment to staging when omitted', () => {
    const { environment: _, ...rest } = valid;
    const result = PolicyDryRunRequestSchema.parse(rest);
    expect(result.environment).toBe('staging');
  });

  it('rejects an invalid environment value', () => {
    expect(() => PolicyDryRunRequestSchema.parse({ ...valid, environment: 'dev' })).toThrow();
  });

  it('rejects a policyId exceeding 100 chars', () => {
    expect(() => PolicyDryRunRequestSchema.parse({ ...valid, policyId: 'P'.repeat(101) })).toThrow();
  });

  it('rejects missing policyId', () => {
    const { policyId: _, ...rest } = valid;
    expect(() => PolicyDryRunRequestSchema.parse(rest)).toThrow();
  });

  it('rejects non-object parameters', () => {
    expect(() => PolicyDryRunRequestSchema.parse({ ...valid, parameters: 'not-an-object' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// PolicyDryRunResponseSchema
// ---------------------------------------------------------------------------

describe('PolicyDryRunResponseSchema', () => {
  const valid = {
    status: 'OK',
    simulatedOutcome: 'No changes.',
    impactScore: 0,
    logs: [],
  };

  it('accepts a valid response', () => {
    expect(() => PolicyDryRunResponseSchema.parse(valid)).not.toThrow();
  });

  it('rejects a status field exceeding 100 chars', () => {
    expect(() => PolicyDryRunResponseSchema.parse({ ...valid, status: 'S'.repeat(101) })).toThrow();
  });

  it('rejects a simulatedOutcome exceeding 500 chars', () => {
    expect(() => PolicyDryRunResponseSchema.parse({ ...valid, simulatedOutcome: 'o'.repeat(501) })).toThrow();
  });

  it('rejects a log entry exceeding 1000 chars', () => {
    expect(() => PolicyDryRunResponseSchema.parse({ ...valid, logs: ['l'.repeat(1001)] })).toThrow();
  });

  it('rejects non-numeric impactScore', () => {
    expect(() => PolicyDryRunResponseSchema.parse({ ...valid, impactScore: 'high' })).toThrow();
  });

  it('rejects missing logs field', () => {
    const { logs: _, ...rest } = valid;
    expect(() => PolicyDryRunResponseSchema.parse(rest)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// DecisionReplaySchema
// ---------------------------------------------------------------------------

describe('DecisionReplaySchema', () => {
  const valid = {
    decisionId: 'DEC-001',
    timestamp: '2025-01-01T00:00:00Z',
    originalOutcome: 'ALLOW',
    policyApplied: 'POL-003',
    context: { agentId: 'agent-1' },
  };

  it('accepts a fully valid payload', () => {
    expect(() => DecisionReplaySchema.parse(valid)).not.toThrow();
  });

  it('accepts an empty context object', () => {
    expect(() => DecisionReplaySchema.parse({ ...valid, context: {} })).not.toThrow();
  });

  it('rejects a decisionId exceeding 100 chars', () => {
    expect(() => DecisionReplaySchema.parse({ ...valid, decisionId: 'D'.repeat(101) })).toThrow();
  });

  it('rejects missing context field', () => {
    const { context: _, ...rest } = valid;
    expect(() => DecisionReplaySchema.parse(rest)).toThrow();
  });

  it('rejects a non-object context', () => {
    expect(() => DecisionReplaySchema.parse({ ...valid, context: 'not-an-object' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ChatRequestSchema
// ---------------------------------------------------------------------------

describe('ChatRequestSchema', () => {
  it('accepts a message without sessionId', () => {
    expect(() => ChatRequestSchema.parse({ message: 'Hello' })).not.toThrow();
  });

  it('accepts a message with a sessionId', () => {
    expect(() => ChatRequestSchema.parse({ message: 'Hi', sessionId: 'sess-abc' })).not.toThrow();
  });

  it('rejects a message exceeding 10000 chars', () => {
    expect(() => ChatRequestSchema.parse({ message: 'm'.repeat(10001) })).toThrow();
  });

  it('rejects a sessionId exceeding 100 chars', () => {
    expect(() => ChatRequestSchema.parse({ message: 'ok', sessionId: 's'.repeat(101) })).toThrow();
  });

  it('rejects missing message field', () => {
    expect(() => ChatRequestSchema.parse({ sessionId: 'sess-1' })).toThrow();
  });

  it('accepts a message of exactly 10000 chars', () => {
    expect(() => ChatRequestSchema.parse({ message: 'm'.repeat(10000) })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AdminApplyPolicySchema
// ---------------------------------------------------------------------------

describe('AdminApplyPolicySchema', () => {
  const valid = {
    policyId: 'POL-007',
    confirmationCode: 'APPLY-POL-007',
    reason: 'Emergency governance update.',
  };

  it('accepts a fully valid payload', () => {
    expect(() => AdminApplyPolicySchema.parse(valid)).not.toThrow();
  });

  it('rejects a policyId exceeding 100 chars', () => {
    expect(() => AdminApplyPolicySchema.parse({ ...valid, policyId: 'P'.repeat(101) })).toThrow();
  });

  it('rejects a confirmationCode exceeding 100 chars', () => {
    expect(() => AdminApplyPolicySchema.parse({ ...valid, confirmationCode: 'C'.repeat(101) })).toThrow();
  });

  it('rejects a reason exceeding 1000 chars', () => {
    expect(() => AdminApplyPolicySchema.parse({ ...valid, reason: 'r'.repeat(1001) })).toThrow();
  });

  it('rejects missing reason field', () => {
    const { reason: _, ...rest } = valid;
    expect(() => AdminApplyPolicySchema.parse(rest)).toThrow();
  });

  it('rejects missing confirmationCode field', () => {
    const { confirmationCode: _, ...rest } = valid;
    expect(() => AdminApplyPolicySchema.parse(rest)).toThrow();
  });
});
