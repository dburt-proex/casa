import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Clock, ServerCrash, Terminal } from 'lucide-react';

export function OpsMetricsView() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/ops/metrics');
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const data = await res.json();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) return <div className="p-4 text-gray-500">Loading operational metrics...</div>;
  if (error) return <div className="p-4 text-red-500">Error loading metrics: {error}</div>;
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0d0d12] border border-gray-800/60 rounded-xl p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-300">Avg Latency</h3>
            <Clock className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-100">{metrics.averageResponseLatencyMs}ms</div>
            <p className="text-xs text-gray-500">Tool execution time</p>
          </div>
        </div>
        
        <div className="bg-[#0d0d12] border border-gray-800/60 rounded-xl p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-300">Total Calls</h3>
            <Activity className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-100">{metrics.recentToolCalls.length}</div>
            <p className="text-xs text-gray-500">In recent memory</p>
          </div>
        </div>

        <div className="bg-[#0d0d12] border border-gray-800/60 rounded-xl p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-300">Error Rates</h3>
            <AlertTriangle className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <div className="text-sm space-y-1 text-gray-300">
              {Object.entries(metrics.errorRateByRoute).length > 0 ? (
                Object.entries(metrics.errorRateByRoute).map(([route, rate]) => (
                  <div key={route} className="flex justify-between">
                    <span className="truncate max-w-[120px]" title={route}>{route}</span>
                    <span className="font-mono">{rate as string}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No errors recorded</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#0d0d12] border border-gray-800/60 rounded-xl p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-gray-300">Top Failures</h3>
            <ServerCrash className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <div className="text-sm space-y-1 text-gray-300">
              {Object.entries(metrics.toolFailuresByType).length > 0 ? (
                Object.entries(metrics.toolFailuresByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <span className="truncate max-w-[120px]">{type}</span>
                    <span className="font-mono">{count as number}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No failures recorded</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0d0d12] border border-gray-800/60 rounded-xl p-4">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-lg font-medium text-gray-100">
            <Terminal className="h-5 w-5" />
            Recent Tool Executions
          </h3>
        </div>
        <div>
          <div className="space-y-2">
            {metrics.recentToolCalls.map((call: any) => (
              <div key={call.id} className="flex items-center justify-between p-3 border border-gray-800/60 bg-gray-900/30 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${call.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                  <span className="font-mono font-medium text-gray-200">{call.toolName}</span>
                  <span className="text-gray-500 text-xs">{new Date(call.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-4">
                  {call.errorType && <span className="text-red-400 text-xs">{call.errorType}</span>}
                  <span className="font-mono text-xs text-gray-500">{call.latencyMs}ms</span>
                </div>
              </div>
            ))}
            {metrics.recentToolCalls.length === 0 && (
              <div className="text-center text-gray-500 py-4">No recent tool calls</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
