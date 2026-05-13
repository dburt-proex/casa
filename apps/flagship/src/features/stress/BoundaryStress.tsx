import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ExplainButton } from '../../components/ExplainButton';

export function BoundaryStress() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/stress').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-500 p-4 bg-red-500/10 rounded-lg border border-red-500/20">Error: {error}</div>;
  if (!data) return <div className="text-gray-500 font-mono text-sm animate-pulse">Analyzing boundary stress...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-200">Boundary Stress Analysis</h2>
        <ExplainButton context="CASA System Boundary Stress Analysis" data={data} />
      </div>
      <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg">
        <h3 className="text-lg font-medium text-gray-200 mb-4">System Boundary Stress Level</h3>
        <div className="flex items-center gap-6">
          <div className="text-5xl font-bold text-amber-400 tracking-tighter">{data.stressLevel}%</div>
          <div className="flex-1 h-3 bg-[#0a0a0c] rounded-full overflow-hidden border border-gray-800/60">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-1000" style={{ width: `${data.stressLevel}%` }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Critical Boundaries</h4>
          <ul className="space-y-3">
            {data.criticalBoundaries.map((b: string, i: number) => (
              <li key={i} className="text-amber-400 bg-amber-400/10 px-4 py-3 rounded-lg border border-amber-400/20 font-mono text-sm">{b}</li>
            ))}
          </ul>
        </div>
        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg">
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Recommendations</h4>
          <ul className="space-y-3">
            {data.recommendations.map((r: string, i: number) => (
              <li key={i} className="text-blue-300 bg-blue-500/10 px-4 py-3 rounded-lg border border-blue-500/20 text-sm">{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
