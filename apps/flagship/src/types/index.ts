export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
}

export interface DryRunResult {
  status: string;
  simulatedOutcome: string;
  impactScore: number;
  logs: string[];
  decisionsAnalyzed?: number;
  decisionsThatChange?: number;
  routingChanges?: Record<string, number>;
  conflicts?: unknown[];
  confidence?: number;
  recommendation?: string;
  environment?: 'staging' | 'production';
  candidatePolicyPath?: string;
}

export type GovernanceSprintStatus = 'REQUESTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type GovernanceSprintPhase = 'Intake' | 'Workflow Map' | 'Controls' | 'Review Gate' | 'Evidence' | 'Handoff';

export interface GovernanceSprintChecklistItem {
  id: string;
  label: string;
  complete: boolean;
}

export interface GovernanceSprintEvidenceItem {
  id: string;
  label: string;
  value?: string;
  href?: string;
  [key: string]: unknown;
}

export interface GovernanceSprint {
  id: string;
  decisionId: string;
  status: GovernanceSprintStatus;
  durationDays: 7 | 14;
  phase: GovernanceSprintPhase;
  workflowSummary: string;
  decisionSnapshot: Record<string, unknown>;
  owner: string | null;
  dueAt: string;
  notes: string;
  checklist: GovernanceSprintChecklistItem[];
  evidence: GovernanceSprintEvidenceItem[];
  createdBy: string;
  createdByRole: 'operator' | 'admin';
  createdAt: string;
  updatedAt: string;
}
