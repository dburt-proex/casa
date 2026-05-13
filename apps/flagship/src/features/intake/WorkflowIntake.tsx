import React, { useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, Ban, ClipboardList, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

type EvaluationResult = {
  agent: string;
  action: string;
  risk: string;
  decision: 'ALLOW' | 'REVIEW' | 'HALT' | string;
};

type FormState = {
  companyName: string;
  industry: string;
  workflowName: string;
  agent: string;
  action: string;
  dataExposure: 'public' | 'internal' | 'private' | 'sensitive';
  customerFacing: boolean;
  reversibility: 'reversible' | 'manual-review' | 'irreversible';
  confidence: number;
};

const initialForm: FormState = {
  companyName: 'Acme Operations',
  industry: 'Field Services',
  workflowName: 'Customer Communication Automation',
  agent: 'demo-agent',
  action: 'send customer-facing email',
  dataExposure: 'internal',
  customerFacing: true,
  reversibility: 'manual-review',
  confidence: 0.7
};

function inferRiskScore(form: FormState) {
  let score = 0.2;
  if (form.customerFacing) score += 0.2;
  if (form.dataExposure === 'private') score += 0.25;
  if (form.dataExposure === 'sensitive') score += 0.35;
  if (form.reversibility === 'manual-review') score += 0.15;
  if (form.reversibility === 'irreversible') score += 0.35;
  if (/delete|remove|erase|expose|refund|payment|send/i.test(form.action)) score += 0.2;
  return Math.min(Number(score.toFixed(2)), 0.99);
}

function decisionStyle(decision?: string) {
  if (decision === 'ALLOW') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (decision === 'REVIEW') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (decision === 'HALT') return 'border-red-500/30 bg-red-500/10 text-red-300';
  return 'border-gray-700 bg-gray-900/50 text-gray-300';
}

function decisionIcon(decision?: string) {
  if (decision === 'ALLOW') return <ShieldCheck className="w-6 h-6" />;
  if (decision === 'REVIEW') return <AlertTriangle className="w-6 h-6" />;
  if (decision === 'HALT') return <Ban className="w-6 h-6" />;
  return <ClipboardList className="w-6 h-6" />;
}

export function WorkflowIntake() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const riskScore = useMemo(() => inferRiskScore(form), [form]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const runEvaluation = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await api.post<EvaluationResult>('/evaluate', {
        companyName: form.companyName,
        industry: form.industry,
        workflowName: form.workflowName,
        agent: form.agent,
        action: form.action,
        signals: {
          risk_score: riskScore,
          confidence: Number(form.confidence),
          data_exposure: form.dataExposure,
          customer_facing: form.customerFacing,
          reversibility: form.reversibility
        }
      });
      setResult(response);
    } catch (e: any) {
      setError(e.message || 'Evaluation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100 tracking-tight">Workflow Intake</h2>
          <p className="text-sm text-gray-400 mt-2 max-w-3xl">
            Enter one proposed AI workflow action. CASA evaluates the action before execution and routes it to ALLOW, REVIEW, or HALT.
          </p>
        </div>
        <div className="text-xs font-mono text-blue-300 border border-blue-500/20 bg-blue-500/10 rounded-lg px-3 py-2">
          Demo-live prototype • evidence-backed routing
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2 text-sm">
              <span className="text-gray-400">Company</span>
              <input className="w-full bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-gray-100" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-gray-400">Industry</span>
              <input className="w-full bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-gray-100" value={form.industry} onChange={(e) => update('industry', e.target.value)} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-gray-400">Workflow</span>
              <input className="w-full bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-gray-100" value={form.workflowName} onChange={(e) => update('workflowName', e.target.value)} />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-gray-400">Agent Name</span>
              <input className="w-full bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-gray-100" value={form.agent} onChange={(e) => update('agent', e.target.value)} />
            </label>
          </div>

          <label className="space-y-2 text-sm block">
            <span className="text-gray-400">Proposed AI Action</span>
            <textarea className="w-full min-h-28 bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-gray-100" value={form.action} onChange={(e) => update('action', e.target.value)} />
            <div className="text-xs text-gray-500">Examples: summarize public support ticket, send customer-facing email, delete customer records.</div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="space-y-2 text-sm">
              <span className="text-gray-400">Data Exposure</span>
              <select className="w-full bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-gray-100" value={form.dataExposure} onChange={(e) => update('dataExposure', e.target.value as FormState['dataExposure'])}>
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="private">Private</option>
                <option value="sensitive">Sensitive</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-gray-400">Reversibility</span>
              <select className="w-full bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-gray-100" value={form.reversibility} onChange={(e) => update('reversibility', e.target.value as FormState['reversibility'])}>
                <option value="reversible">Reversible</option>
                <option value="manual-review">Manual Review</option>
                <option value="irreversible">Irreversible</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-gray-400">Confidence</span>
              <input type="number" min="0" max="1" step="0.05" className="w-full bg-[#0a0a0c] border border-gray-800 rounded-lg px-3 py-2 text-gray-100" value={form.confidence} onChange={(e) => update('confidence', Number(e.target.value))} />
            </label>
            <label className="flex items-end gap-3 text-sm text-gray-300 pb-2">
              <input type="checkbox" checked={form.customerFacing} onChange={(e) => update('customerFacing', e.target.checked)} />
              Customer-facing
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-gray-800 pt-5">
            <div className="text-sm text-gray-400">Computed signal risk_score: <span className="font-mono text-gray-100">{riskScore}</span></div>
            <button onClick={runEvaluation} disabled={loading || !form.action.trim()} className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
              {loading ? 'Evaluating...' : 'Evaluate with CASA'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Decision Result</h3>
            {error && <div className="text-red-300 text-sm border border-red-500/20 bg-red-500/10 rounded-lg p-3">{error}</div>}
            {!result && !error && <div className="text-sm text-gray-500">Submit a workflow action to generate a governed decision.</div>}
            {result && (
              <div className={cn('rounded-xl border p-5 space-y-4', decisionStyle(result.decision))}>
                <div className="flex items-center gap-3">
                  {decisionIcon(result.decision)}
                  <div className="text-3xl font-semibold tracking-tight">{result.decision}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono text-gray-200">
                  <div><span className="text-gray-500">Risk</span><br />{result.risk}</div>
                  <div><span className="text-gray-500">Agent</span><br />{result.agent}</div>
                </div>
                <div className="text-xs text-gray-300 border-t border-white/10 pt-3">{result.action}</div>
              </div>
            )}
          </div>

          <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg space-y-4">
            <h3 className="text-sm font-medium text-gray-300">Evidence Snapshot</h3>
            <div className="text-xs text-gray-400 space-y-2">
              <div>Company: <span className="text-gray-200">{form.companyName}</span></div>
              <div>Workflow: <span className="text-gray-200">{form.workflowName}</span></div>
              <div>Policy route: <span className="text-gray-200">pre-execution gate</span></div>
              <div>Ledger: <span className="text-gray-200">open Audit Ledger after evaluation</span></div>
            </div>
            <a href="/" className="inline-flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200">
              Refresh dashboard after evaluation <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="p-6 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-lg space-y-3">
            <h3 className="text-sm font-medium text-blue-200">Next Step</h3>
            <p className="text-xs text-gray-300">Use this result to scope a 7–14 day CASA Governance Sprint: map one workflow, insert ALLOW / REVIEW / HALT control, and produce decision evidence.</p>
            <button className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium">Request Governance Sprint</button>
          </div>
        </div>
      </div>
    </div>
  );
}
