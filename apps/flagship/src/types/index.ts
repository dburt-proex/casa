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
