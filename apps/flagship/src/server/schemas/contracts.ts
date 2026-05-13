import { z } from 'zod';

// ============================================================================
// Python Bridge Contracts
// ============================================================================

export const DashboardSchema = z.object({
  activePolicies: z.number(),
  decisions24h: z.number(),
  boundaryAlerts: z.number(),
  systemStatus: z.enum(['healthy', 'degraded', 'critical']),
});

export const BoundaryStressSchema = z.object({
  stressLevel: z.number().min(0).max(100),
  criticalBoundaries: z.array(z.string().max(200)),
  recommendations: z.array(z.string().max(500)),
});

export const PolicyDryRunRequestSchema = z.object({
  policyId: z.string().max(100),
  parameters: z.record(z.string().max(100), z.any()),
  environment: z.enum(['staging', 'production']).default('staging'),
});

export const PolicyDryRunResponseSchema = z.object({
  status: z.string().max(100),
  simulatedOutcome: z.string().max(500),
  impactScore: z.number(),
  logs: z.array(z.string().max(1000)),
});

export const DecisionReplaySchema = z.object({
  decisionId: z.string().max(100),
  timestamp: z.string().max(100),
  originalOutcome: z.string().max(100),
  policyApplied: z.string().max(100),
  context: z.record(z.string().max(100), z.any()),
});

// ============================================================================
// API Route Contracts
// ============================================================================

export const ChatRequestSchema = z.object({
  sessionId: z.string().max(100).optional(),
  message: z.string().max(10000), // Max 10k chars for chat message
});

export const AdminApplyPolicySchema = z.object({
  policyId: z.string().max(100),
  confirmationCode: z.string().max(100),
  reason: z.string().max(1000),
});
