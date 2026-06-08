import { 
  DashboardSchema, 
  BoundaryStressSchema, 
  PolicyDryRunRequestSchema, 
  PolicyDryRunResponseSchema,
  DecisionReplaySchema
} from '../schemas/contracts.js';
import { z } from 'zod';

const DEFAULT_DEV_BACKEND_URL = 'http://127.0.0.1:5000';
const DEFAULT_PRODUCTION_HOSTS = ['casa-governance-api', 'casa-governance-api.onrender.com'];
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

type JsonRecord = Record<string, any>;

export type WorkflowEvaluationRequest = {
  companyName?: string;
  industry?: string;
  workflowName?: string;
  agent: string;
  action: string;
  signals: JsonRecord;
};

type BackendUrlCandidate = {
  raw: string;
  source: string | null;
  configured: boolean;
};

type BackendUrlResolution = BackendUrlCandidate & {
  baseUrl: string;
};

export type BackendBridgeConfigStatus = {
  backendConfigured: boolean;
  backendUrlValid: boolean;
};

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function selectBackendUrlCandidate(): BackendUrlCandidate {
  const canonical = process.env.CASA_GOVERNANCE_API_URL?.trim();
  if (canonical) {
    return { raw: canonical, source: 'CASA_GOVERNANCE_API_URL', configured: true };
  }

  if (!isProduction()) {
    const legacyCasaUrl = process.env.CASA_API_URL?.trim();
    if (legacyCasaUrl) {
      return { raw: legacyCasaUrl, source: 'CASA_API_URL', configured: true };
    }

    const legacyBackendUrl = process.env.BACKEND_API_URL?.trim();
    if (legacyBackendUrl) {
      return { raw: legacyBackendUrl, source: 'BACKEND_API_URL', configured: true };
    }

    return { raw: DEFAULT_DEV_BACKEND_URL, source: 'development-default', configured: false };
  }

  return { raw: '', source: null, configured: false };
}

function parseAllowedProductionHosts() {
  const configuredHosts = (process.env.CASA_GOVERNANCE_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_PRODUCTION_HOSTS, ...configuredHosts]);
}

export function resolveBackendBaseUrl(): BackendUrlResolution {
  const candidate = selectBackendUrlCandidate();

  if (!candidate.raw) {
    throw new Error('CASA_GOVERNANCE_API_URL must be configured in production');
  }

  if (/^[A-Z0-9_]+\s*=/i.test(candidate.raw)) {
    throw new Error(`Invalid ${candidate.source || 'backend URL'} value: paste only the URL, not KEY=value`);
  }

  const rawUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate.raw) ? candidate.raw : `http://${candidate.raw}`;
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid ${candidate.source || 'backend URL'} value: must be a valid HTTP(S) URL`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Invalid ${candidate.source || 'backend URL'} value: only HTTP(S) URLs are supported`);
  }

  if (isProduction()) {
    const allowedHosts = parseAllowedProductionHosts();
    if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
      throw new Error('Invalid CASA_GOVERNANCE_API_URL host for production');
    }
  }

  return {
    ...candidate,
    baseUrl: parsed.toString().replace(/\/$/, ''),
  };
}

export function getBackendBridgeConfigStatus(): BackendBridgeConfigStatus {
  try {
    const resolved = resolveBackendBaseUrl();
    return {
      backendConfigured: resolved.configured,
      backendUrlValid: true,
    };
  } catch {
    const candidate = selectBackendUrlCandidate();
    return {
      backendConfigured: candidate.configured,
      backendUrlValid: false,
    };
  }
}

function getBackendBaseUrl() {
  return resolveBackendBaseUrl().baseUrl;
}

function riskToScore(risk: string): number {
  const normalized = String(risk || '').toUpperCase();
  if (normalized === 'LOW') return 25;
  if (normalized === 'MEDIUM') return 50;
  if (normalized === 'HIGH') return 75;
  if (normalized === 'CRITICAL') return 95;
  return 50;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
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

    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error(`Backend Bridge Error: Response payload too large (${text.length} characters)`);
    }
    
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Backend Bridge Error: Expected JSON response from governance API');
    }
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

function normalizeLedgerDecision(raw: JsonRecord): JsonRecord {
  const decisionId = String(raw.id || raw.decision_id || raw.decisionId || '');
  const status = String(raw.status || raw.decision || 'UNKNOWN').toUpperCase();
  const risk = String(raw.risk || raw.liabilityGrade || 'MEDIUM').toUpperCase();
  const timestamp = String(raw.timestamp || raw.time || raw.created_at || '');

  return {
    id: decisionId,
    decision_id: decisionId,
    timestamp,
    agent: String(raw.agent || 'unknown-agent'),
    action: String(raw.action || 'unknown-action'),
    status,
    decision: status,
    risk,
    liabilityGrade: risk,
    riskScore: Number(raw.riskScore ?? raw.risk_score ?? riskToScore(risk)),
    policyVersion: raw.policy_version || raw.policyVersion || 'unknown',
    policyResult: raw.policy_result || raw.policyResult || 'unknown',
    signals: raw.signals || {},
    reason: raw.reason || 'No deterministic reason was recorded for this decision.',
    reasonCode: raw.reason_code || raw.reasonCode || 'unknown',
    riskFactors: raw.risk_factors || raw.riskFactors || [],
    recommendedNextStep: raw.recommended_next_step || raw.recommendedNextStep || '',
  };
}

export const backendBridge = {
  async evaluateAction(payload: WorkflowEvaluationRequest, requestId?: string): Promise<JsonRecord> {
    const backendApiUrl = getBackendBaseUrl();
    const headers = {
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Request-ID': requestId } : {})
    };
    return fetchWithTimeout(`${backendApiUrl}/evaluate`, {
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
    const backendApiUrl = getBackendBaseUrl();
    const headers = requestId ? { 'X-Request-ID': requestId } : {};
    const data = await fetchWithTimeout(`${backendApiUrl}/dashboard`, { headers });
    return normalizeDashboard(data);
  },

  async getBoundaryStress(requestId?: string): Promise<z.infer<typeof BoundaryStressSchema>> {
    const backendApiUrl = getBackendBaseUrl();
    const headers = requestId ? { 'X-Request-ID': requestId } : {};
    const data = await fetchWithTimeout(`${backendApiUrl}/boundary-stress`, { headers });
    return normalizeBoundaryStress(data);
  },

  async runDryRun(payload: z.infer<typeof PolicyDryRunRequestSchema>, requestId?: string): Promise<z.infer<typeof PolicyDryRunResponseSchema>> {
    const backendApiUrl = getBackendBaseUrl();
    const parsed = PolicyDryRunRequestSchema.parse(payload);
    const candidatePath = parsed.parameters?.policy_candidate_path || parsed.parameters?.policyCandidatePath;
    if (!candidatePath) {
      throw new Error(`No policy candidate path configured for ${parsed.policyId}`);
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Request-ID': requestId } : {})
    };
    const data = await fetchWithTimeout(`${backendApiUrl}/policy/dryrun`, {
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
    const backendApiUrl = getBackendBaseUrl();
    const headers = requestId ? { 'X-Request-ID': requestId } : {};
    const data = await fetchWithTimeout(`${backendApiUrl}/decision-replay/${encodeURIComponent(decisionId)}`, { headers });
    return normalizeDecisionReplay(data, decisionId);
  },

  async getFlaggedDecisions(requestId?: string): Promise<JsonRecord[]> {
    const backendApiUrl = getBackendBaseUrl();
    const headers = requestId ? { 'X-Request-ID': requestId } : {};
    const data = await fetchWithTimeout(`${backendApiUrl}/decisions/flagged`, { headers });
    return Array.isArray(data) ? data.map(normalizeLedgerDecision) : [];
  },

  async getDecisionHistory(requestId?: string): Promise<JsonRecord[]> {
    const backendApiUrl = getBackendBaseUrl();
    const headers = requestId ? { 'X-Request-ID': requestId } : {};
    const data = await fetchWithTimeout(`${backendApiUrl}/ledger`, { headers });
    const entries = Array.isArray(data) ? data.map(normalizeLedgerDecision) : [];
    return entries.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  },

  async reviewDecision(
    decisionId: string,
    action: 'APPROVE' | 'HALT',
    reviewer: string,
    notes = '',
    requestId?: string
  ): Promise<JsonRecord> {
    const backendApiUrl = getBackendBaseUrl();
    const headers = {
      'Content-Type': 'application/json',
      ...(requestId ? { 'X-Request-ID': requestId } : {})
    };
    return fetchWithTimeout(`${backendApiUrl}/decisions/${encodeURIComponent(decisionId)}/review`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, reviewer, notes })
    });
  },

  async applyPolicy(_policyId: string, _reason: string, _requestId?: string): Promise<{ success: boolean; auditId: string }> {
    throw new Error('Canonical CASA governance API does not yet expose admin policy apply. Add this endpoint in casa-control-plane before enabling policy mutation from CASA-Flagship.');
  }
};
