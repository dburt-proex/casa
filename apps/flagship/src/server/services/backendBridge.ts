import { 
  DashboardSchema, 
  BoundaryStressSchema, 
  PolicyDryRunRequestSchema, 
  PolicyDryRunResponseSchema,
  DecisionReplaySchema
} from '../schemas/contracts.js';
import { z } from 'zod';

let BACKEND_API_URL = process.env.CASA_GOVERNANCE_API_URL || process.env.CASA_API_URL || process.env.BACKEND_API_URL || 'http://127.0.0.1:5000';
if (BACKEND_API_URL.startsWith('CASA_GOVERNANCE_API_URL=')) {
  BACKEND_API_URL = BACKEND_API_URL.replace('CASA_GOVERNANCE_API_URL=', '');
}
if (!/^https?:\/\//i.test(BACKEND_API_URL)) {
  BACKEND_API_URL = `http://${BACKEND_API_URL}`;
}
if (BACKEND_API_URL.endsWith('/')) {
  BACKEND_API_URL = BACKEND_API_URL.slice(0, -1);
}
console.log('[BACKEND BRIDGE] Initialized with canonical CASA Governance API:', BACKEND_API_URL);

type JsonRecord = Record<string, any>;

export type WorkflowEvaluationRequest = {
  companyName?: string;
  industry?: string;
  workflowName?: string;
  agent: string;
  action: string;
  signals: JsonRecord;
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      throw new Error(`Backend Bridge Error: Response payload too large (${contentLength} bytes)`);
    }

    const text = await response.text();
    if (!response.ok) {
      let detail = text;
      try {
        const parsed = JSON.parse(text);
        detail = parsed.detail || parsed.error || parsed.message || text;
      } catch {
        // Keep plain text response detail.
      }
      throw new Error(`Backend Bridge Error: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ''}`);
    }

    if (text.length > 5 * 1024 * 1024) {
      throw new Error(`Backend Bridge Error: Response payload too large (${text.length} characters)`);
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Backend Bridge Timeout: Request to ${url} exceeded ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

function normalizeSystemStatus(raw: JsonRecord): 'healthy' | 'degraded' | 'critical' {
  const status = String(raw.system_state?.mode || raw.boundary_stress?.system_state || raw.systemStatus || raw.status || '').toUpperCase();
  if (status.includes('CRITICAL') || status.includes('HALT') || status.includes('ATTENTION')) return 'critical';
  if (status.includes('CAUTION') || status.includes('REVIEW') || status.includes('DEGRADED')) return 'degraded';
  return 'healthy';
}

function normalizeDashboard(raw: JsonRecord): z.infer<typeof DashboardSchema> {
  const health = raw.governance_health || {};
  const stress = raw.boundary_stress || {};
  const warnings = Array.isArray(stress.warnings) ? stress.warnings : [];

  return DashboardSchema.parse({
    activePolicies: Number(
      raw.activePolicies ??
      raw.active_policies ??
      (raw.system_state?.policy_version ? 1 : 0)
    ),
    decisions24h: Number(raw.decisions24h ?? health.total_decisions ?? 0),
    boundaryAlerts: Number(raw.boundaryAlerts ?? warnings.length),
    systemStatus: normalizeSystemStatus(raw)
  });
}

function normalizeBoundaryStress(raw: JsonRecord): z.infer<typeof BoundaryStressSchema> {
  const warnings = Array.isArray(raw.warnings) ? raw.warnings : [];
  const recommendations = warnings.length ? warnings : [String(raw.system_state || 'STABLE')];
  const stressScore = Number(raw.stressLevel ?? raw.stress_score ?? 0);

  return BoundaryStressSchema.parse({
    stressLevel: stressScore <= 1 ? Math.round(stressScore * 100) : Math.round(stressScore),
    criticalBoundaries: warnings.map(String),
    recommendations: recommendations.map(String)
  });
}

function normalizePolicyDryRun(raw: JsonRecord): z.infer<typeof PolicyDryRunResponseSchema> {
  const conflicts = Array.isArray(raw.conflicts) ? raw.conflicts : [];
  const indicators = Array.isArray(raw.risk_indicators) ? raw.risk_indicators : [];
  const logs = Array.isArray(raw.logs) ? raw.logs : [...conflicts, ...indicators].map((item) => typeof item === 'string' ? item : JSON.stringify(item));
  const decisionsThatChange = Number(raw.decisions_that_change ?? raw.decisionsThatChange ?? 0);
  const recommendation = raw.recommendation ? String(raw.recommendation) : undefined;

  return PolicyDryRunResponseSchema.parse({
    status: String(raw.status || raw.recommendation || 'SIMULATED'),
    simulatedOutcome: String(raw.simulatedOutcome || `${decisionsThatChange} decisions would change under candidate policy.`),
    impactScore: Number(raw.impactScore ?? raw.confidence ?? decisionsThatChange),
    logs,
    decisionsAnalyzed: Number(raw.decisions_analyzed ?? raw.decisionsAnalyzed ?? 0),
    decisionsThatChange,
    routingChanges: raw.routing_changes || raw.routingChanges || {},
    conflicts,
    confidence: Number(raw.confidence ?? 0),
    recommendation,
    environment: raw.environment === 'production' ? 'production' : 'staging',
    candidatePolicyPath: raw.candidate_policy_path || raw.candidatePolicyPath,
  });
}

function normalizeDecisionReplay(raw: JsonRecord, decisionId: string): z.infer<typeof DecisionReplaySchema> {
  return DecisionReplaySchema.parse({
    decisionId: String(raw.decisionId || raw.decision_id || decisionId),
    timestamp: String(raw.timestamp || raw.time || raw.created_at || ''),
    originalOutcome: String(raw.originalOutcome || raw.original_decision || raw.decision || 'unknown'),
    policyApplied: String(raw.policyApplied || raw.policy_version || raw.current_policy_version || 'unknown'),
    context: raw.context || raw.signals || raw
  });
}

export const backendBridge = {
  async evaluateAction(payload: WorkflowEvaluationRequest, requestId?: string): Promise<JsonRecord> {
    const headers = {
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Request-ID': requestId } : {})
    };
    return fetchWithTimeout(`${BACKEND_API_URL}/evaluate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        agent: payload.agent,
        action: payload.action,
        signals: {
          ...payload.signals,
          company_name: payload.companyName,
          industry: payload.industry,
          workflow_name: payload.workflowName
        }
      })
    });
  },

  async getDashboard(requestId?: string): Promise<z.infer<typeof DashboardSchema>> {
    const headers = requestId ? { 'X-Request-ID': requestId } : {};
    const data = await fetchWithTimeout(`${BACKEND_API_URL}/dashboard`, { headers });
    return normalizeDashboard(data);
  },

  async getBoundaryStress(requestId?: string): Promise<z.infer<typeof BoundaryStressSchema>> {
    const headers = requestId ? { 'X-Request-ID': requestId } : {};
    const data = await fetchWithTimeout(`${BACKEND_API_URL}/boundary-stress`, { headers });
    return normalizeBoundaryStress(data);
  },

  async runDryRun(payload: z.infer<typeof PolicyDryRunRequestSchema>, requestId?: string): Promise<z.infer<typeof PolicyDryRunResponseSchema>> {
    const parsed = PolicyDryRunRequestSchema.parse(payload);
    const candidatePath = parsed.parameters?.policy_candidate_path || parsed.parameters?.policyCandidatePath;
    if (!candidatePath) {
      throw new Error(`No policy candidate path configured for ${parsed.policyId}`);
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Request-ID': requestId } : {})
    };
    const data = await fetchWithTimeout(`${BACKEND_API_URL}/policy/dryrun`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        policy_candidate_path: candidatePath,
        environment: parsed.environment
      })
    });
    return normalizePolicyDryRun(data);
  },

  async replayDecision(decisionId: string, requestId?: string): Promise<z.infer<typeof DecisionReplaySchema>> {
    const headers = requestId ? { 'X-Request-ID': requestId } : {};
    const data = await fetchWithTimeout(`${BACKEND_API_URL}/decision-replay/${encodeURIComponent(decisionId)}`, { headers });
    return normalizeDecisionReplay(data, decisionId);
  },

  async applyPolicy(_policyId: string, _reason: string, _requestId?: string): Promise<{ success: boolean; auditId: string }> {
    throw new Error('Canonical CASA governance API does not yet expose admin policy apply. Add this endpoint in casa-control-plane before enabling policy mutation from CASA-Flagship.');
  }
};
