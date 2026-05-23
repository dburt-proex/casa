import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

type ConfigStatus = {
  clerkConfigured: boolean;
  geminiConfigured: boolean;
  backendConfigured: boolean;
  postgresConfigured: boolean;
  corsOriginsConfigured: boolean;
};

const checks: Array<{ key: keyof ConfigStatus; label: string; required: boolean }> = [
  { key: 'clerkConfigured', label: 'Clerk Auth', required: true },
  { key: 'geminiConfigured', label: 'Gemini Explain', required: true },
  { key: 'backendConfigured', label: 'Governance API', required: true },
  { key: 'postgresConfigured', label: 'Postgres Ledger', required: true },
  { key: 'corsOriginsConfigured', label: 'CORS Locked', required: false },
];

export function DemoReadiness() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<ConfigStatus>('/config/status');
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load demo readiness');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const blockers = status
    ? checks.filter((check) => check.required && !status[check.key]).length
    : 0;

  return (
    <div className="rounded-xl border border-gray-800/60 bg-[#12121a] p-5 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-gray-200">Demo Readiness</h3>
          <p className="mt-1 text-xs text-gray-500">
            Preflight status for guided client walkthroughs and async follow-up access.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-700/60 bg-[#0a0a0c] px-3 py-2 text-xs text-gray-300 hover:border-emerald-500/30 hover:text-emerald-300 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5">
          {checks.map((check) => {
            const ok = Boolean(status?.[check.key]);
            const warningOnly = !check.required && !ok;
            return (
              <div
                key={check.key}
                className={cn(
                  'rounded-lg border px-3 py-3',
                  ok && 'border-emerald-500/20 bg-emerald-500/10',
                  !ok && check.required && 'border-red-500/20 bg-red-500/10',
                  warningOnly && 'border-amber-500/20 bg-amber-500/10'
                )}
              >
                <div className="flex items-center gap-2">
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className={cn('h-4 w-4', check.required ? 'text-red-400' : 'text-amber-400')} />
                  )}
                  <span className="text-xs font-medium text-gray-200">{check.label}</span>
                </div>
                <div className="mt-2 text-[11px] text-gray-500">
                  {ok ? 'Ready' : check.required ? 'Needs setup' : 'Tighten after demo URL is final'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status && (
        <div className={cn(
          'mt-4 rounded-lg border px-4 py-3 text-xs',
          blockers === 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-red-500/20 bg-red-500/10 text-red-200'
        )}>
          {blockers === 0
            ? 'Guided demo is ready. Keep admin actions controlled and send async access only with prototype context.'
            : `${blockers} required demo check${blockers === 1 ? '' : 's'} need attention before async access.`}
        </div>
      )}
    </div>
  );
}
