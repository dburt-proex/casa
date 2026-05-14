import React, { useState } from 'react';
import { Play, ShieldAlert, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { DryRunResult } from '../../types';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import Markdown from 'react-markdown';
import { useAuth } from '../../contexts/AuthContext';

const POLICY_CANDIDATES = {
  'POL-102': {
    label: 'POL-102: Data Egress Boundary',
    candidatePath: 'policy-candidates/POL-102-data-egress-boundary.json',
  },
  'POL-105': {
    label: 'POL-105: Rate Limit Override',
    candidatePath: 'policy-candidates/POL-105-rate-limit-override.json',
  },
} as const;

type PolicyId = keyof typeof POLICY_CANDIDATES;
type Environment = 'staging' | 'production';

export function PolicyLab() {
  const { isAdmin } = useAuth();
  const [selectedPolicyId, setSelectedPolicyId] = useState<PolicyId>('POL-102');
  const [environment, setEnvironment] = useState<Environment>('staging');
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const runDryRun = async () => {
    setIsSimulating(true);
    setError(null);
    setAnalysis(null);
    try {
      const data = await api.post<DryRunResult>('/policy/dryrun', {
        policyId: selectedPolicyId,
        environment,
        parameters: {
          policy_candidate_path: POLICY_CANDIDATES[selectedPolicyId].candidatePath,
        }
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const analyzeImpact = async () => {
    if (!result) return;
    setIsAnalyzing(true);
    try {
      const data = await api.post<any>('/policy/analyze', {
        policyId: selectedPolicyId,
        dryRunResult: result
      });
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyPolicy = async () => {
    setIsConfirmOpen(false);
    setError(null);
    try {
      await api.post('/admin/policy/apply', {
        policyId: 'POL-102',
        confirmationCode: 'APPLY-POL-102',
        reason: 'Operator confirmed production policy mutation',
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-200">Policy Simulation Lab</h3>
          <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-mono">
            DRY RUN ONLY
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-mono text-gray-500 uppercase">Target Policy</label>
            <select
              aria-label="Target Policy"
              value={selectedPolicyId}
              onChange={(event) => {
                setSelectedPolicyId(event.target.value as PolicyId);
                setResult(null);
                setAnalysis(null);
                setError(null);
              }}
              className="w-full bg-[#1a1a24] border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
            >
              {Object.entries(POLICY_CANDIDATES).map(([id, policy]) => (
                <option key={id} value={id}>{policy.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono text-gray-500 uppercase">Environment</label>
            <select
              aria-label="Environment"
              value={environment}
              onChange={(event) => {
                setEnvironment(event.target.value as Environment);
                setResult(null);
                setAnalysis(null);
                setError(null);
              }}
              className="w-full bg-[#1a1a24] border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
            >
              <option value="staging">Staging (Shadow Mode)</option>
              <option value="production">Production (Dry Run)</option>
            </select>
          </div>
        </div>
        {!isAdmin && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Policy simulations are admin-only. Ask an admin to run this dry-run for production evidence.
          </div>
        )}
        
        <button 
          onClick={runDryRun}
          disabled={!isAdmin || isSimulating}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSimulating ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Execute Simulation
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5" />
          {error}
        </div>
      )}

      {result && (
        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between border-b border-gray-800/60 pb-4">
            <h4 className="text-md font-medium text-gray-200 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Simulation Results
            </h4>
              <div className="text-xs font-mono text-gray-500">ID: SIM-{Math.random().toString(36).substring(7).toUpperCase()}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
              <div className="text-xs text-gray-500 font-mono mb-1">DECISIONS ANALYZED</div>
              <div className="text-lg font-medium text-emerald-400">{result.decisionsAnalyzed ?? 0}</div>
            </div>
            <div className="p-4 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
              <div className="text-xs text-gray-500 font-mono mb-1">WOULD CHANGE</div>
              <div className="text-lg font-medium text-gray-200">{result.decisionsThatChange ?? 0}</div>
            </div>
            <div className="p-4 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
              <div className="text-xs text-gray-500 font-mono mb-1">CONFIDENCE</div>
              <div className="text-lg font-medium text-blue-400">{result.confidence ?? result.impactScore}%</div>
            </div>
          </div>

          <div className="rounded-lg bg-[#0a0a0c] border border-gray-800/60 p-4">
            <div className="text-xs text-gray-500 font-mono mb-2">SIMULATION SUMMARY</div>
            <div className="text-sm text-gray-300">{result.recommendation || result.simulatedOutcome}</div>
            <div className="mt-2 text-xs text-gray-500">
              {result.candidatePolicyPath || POLICY_CANDIDATES[selectedPolicyId].candidatePath} - {result.environment || environment} dry run
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-mono text-gray-500 uppercase">Execution Logs</div>
            <div className="bg-[#0a0a0c] border border-gray-800/60 rounded-lg p-4 font-mono text-xs text-gray-400 space-y-1 h-32 overflow-y-auto">
              {result.logs.map((log, i) => (
                <div key={i} className="flex gap-4">
                  <span className="text-gray-600">[{new Date().toISOString().split('T')[1].split('.')[0]}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

          {analysis && (
            <div className="mt-6 p-5 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Sparkles className="w-4 h-4" />
                <h4 className="font-medium text-sm">AI Policy Impact Analysis</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 font-mono mb-1">SUMMARY</div>
                  <div className="text-sm text-gray-300">{analysis.summary}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-mono mb-1">PREDICTED REVIEW LOAD</div>
                  <div className="text-sm text-gray-300">{analysis.predictedReviewLoad}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 font-mono mb-1">OUTCOME COMPARISON</div>
                  <div className="text-sm text-gray-300">{analysis.outcomeComparison}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 font-mono mb-1">APPROVAL BRIEF</div>
                  <div className="text-sm text-gray-300 prose prose-invert prose-sm max-w-none">
                    <Markdown>{analysis.approvalBrief}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-gray-800/60 flex justify-between items-center">
            <button 
              onClick={analyzeImpact}
              disabled={!isAdmin || isAnalyzing || analysis !== null}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {analysis ? 'Analysis Complete' : 'Analyze Impact'}
            </button>
            <button 
              onClick={() => setIsConfirmOpen(true)}
              disabled
              title="Production policy mutation is disabled until the governance API exposes an audited apply endpoint."
              className="px-6 py-2.5 bg-gray-800/60 text-gray-500 border border-gray-700/40 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Unavailable
            </button>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={isConfirmOpen}
        title="Confirm Policy Mutation"
        description="You are about to apply POL-102 to the production environment. This will immediately affect data egress boundaries for all active tenants. This action will be recorded in the immutable audit log."
        expectedConfirmationText="APPLY-POL-102"
        onConfirm={applyPolicy}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
