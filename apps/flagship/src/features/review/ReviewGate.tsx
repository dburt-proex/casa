import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ShieldAlert, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { ExplainButton } from '../../components/ExplainButton';

export function ReviewGate() {
  const [flagged, setFlagged] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFlagged = async () => {
    setLoading(true);
    try {
      const data = await api.get('/decisions/flagged') as any;
      setFlagged(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlagged();
  }, []);

  const handleReview = async (id: string, action: 'APPROVE' | 'HALT') => {
    try {
      await api.post(`/decisions/${id}/review`, { action });
      setFlagged(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      alert(`Failed to ${action}: ${err.message}`);
    }
  };

  if (loading) return <div className="text-gray-400 animate-pulse">Loading flagged decisions...</div>;
  if (error) return <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20">{error}</div>;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-gray-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          Review Gate
        </h2>
        <div className="text-sm text-gray-400">
          {flagged.length} decision{flagged.length !== 1 ? 's' : ''} pending human review
        </div>
      </div>

      {flagged.length === 0 ? (
        <div className="p-12 text-center border border-gray-800/60 rounded-xl bg-[#12121a] text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500/50" />
          <p>No decisions currently require human intervention.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flagged.map(decision => (
            <div key={decision.id} className="p-6 rounded-xl bg-[#12121a] border border-amber-500/20 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-medium text-gray-200">{decision.id}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                      PENDING REVIEW
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 font-mono">{new Date(decision.timestamp).toLocaleString()}</div>
                </div>
                <ExplainButton context={`Review Gate Decision ${decision.id}`} data={decision} />
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-3 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
                  <div className="text-xs text-gray-500 font-mono mb-1">AGENT</div>
                  <div className="text-sm text-gray-300 font-medium">{decision.agent}</div>
                </div>
                <div className="p-3 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
                  <div className="text-xs text-gray-500 font-mono mb-1">ACTION</div>
                  <div className="text-sm text-gray-300 font-medium">{decision.action}</div>
                </div>
                <div className="p-3 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
                  <div className="text-xs text-gray-500 font-mono mb-1">LIABILITY GRADE</div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${decision.liabilityGrade === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'}`} />
                    <span className={`text-sm font-bold ${decision.liabilityGrade === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>
                      {decision.liabilityGrade}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
                  <div className="text-xs text-gray-500 font-mono mb-1">RISK SCORE</div>
                  <div className="text-sm text-gray-300 font-medium">{decision.riskScore}/100</div>
                </div>
              </div>

              <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800/60">
                <div className="text-xs text-gray-500 font-mono mb-2">FLAG REASON</div>
                <p className="text-sm text-gray-300">{decision.reason}</p>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-800/60">
                <button
                  onClick={() => handleReview(decision.id, 'HALT')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Halt Action
                </button>
                <button
                  onClick={() => handleReview(decision.id, 'APPROVE')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Action
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
