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
  decisionsAnalyzed: z.number().optional(),
  decisionsThatChange: z.number().optional(),
  routingChanges: z.record(z.string(), z.number()).optional(),
  conflicts: z.array(z.any()).optional(),
  confidence: z.number().optional(),
  recommendation: z.string().optional(),
  environment: z.enum(['staging', 'production']).optional(),
  candidatePolicyPath: z.string().optional(),
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

export const GovernanceSprintStatusSchema = z.enum(['REQUESTED', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
export const GovernanceSprintPhaseSchema = z.enum([
  'Intake',
  'Workflow Map',
  'Controls',
  'Review Gate',
  'Evidence',
  'Handoff',
]);

export const GovernanceSprintChecklistItemSchema = z.object({
  id: z.string().max(100),
  label: z.string().max(200),
  complete: z.boolean(),
});

export const GovernanceSprintEvidenceItemSchema = z.object({
  id: z.string().max(100),
  label: z.string().max(200),
  value: z.string().max(1000).optional(),
  href: z.string().max(500).optional(),
}).passthrough();

export const GovernanceSprintCreateSchema = z.object({
  decisionId: z.string().min(1).max(100),
  workflowSummary: z.string().min(1).max(500),
  decisionSnapshot: z.record(z.string(), z.any()).default({}),
  durationDays: z.union([z.literal(7), z.literal(14)]).default(7),
  notes: z.string().max(2000).optional(),
  source: z.enum(['workflow_intake', 'review_gate', 'manual']).default('manual'),
});

export const GovernanceSprintUpdateSchema = z.object({
  status: GovernanceSprintStatusSchema.optional(),
  phase: GovernanceSprintPhaseSchema.optional(),
  owner: z.string().max(200).nullable().optional(),
  notes: z.string().max(4000).optional(),
  checklist: z.array(GovernanceSprintChecklistItemSchema).max(20).optional(),
  evidence: z.array(GovernanceSprintEvidenceItemSchema).max(50).optional(),
});
