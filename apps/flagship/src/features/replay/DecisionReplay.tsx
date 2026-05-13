import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Search, History, ArrowRight } from 'lucide-react';
import { ExplainButton } from '../../components/ExplainButton';

export function DecisionReplay() {
  const [decisionId, setDecisionId] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/decisions/history') as any;
      setHistoryList(res);
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  const handleSearch = async (e?: React.FormEvent, idToFetch?: string) => {
    if (e) e.preventDefault();
    const targetId = idToFetch || decisionId;
    if (!targetId.trim()) return;
    
    setDecisionId(targetId);
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/replay/${targetId}`);
      setData(res);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Audit Ledger */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center gap-2 text-gray-200 font-medium mb-6">
          <History className="w-5 h-5 text-blue-400" />
          Audit Ledger
        </div>
        
        <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2 custom-scrollbar">
          {historyList.map(item => (
            <div 
              key={item.id}
              onClick={() => handleSearch(undefined, item.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${decisionId === item.id ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#12121a] border-gray-800/60 hover:border-gray-700'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-200">{item.id}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.status === 'ALLOW' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {item.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 font-mono mb-2">{new Date(item.timestamp).toLocaleString()}</div>
              <div className="text-sm text-gray-400 truncate">{item.action}</div>
            </div>
          ))}
          {historyList.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-8">No historical decisions found.</div>
          )}
        </div>
      </div>

      {/* Right Column: Replay Details */}
      <div className="lg:col-span-2 space-y-6">
        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg">
          <h3 className="text-lg font-medium text-gray-200 mb-4">Decision Replay & Provenance</h3>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={decisionId}
                onChange={e => setDecisionId(e.target.value)}
                placeholder="Enter Decision ID (e.g., DEC-123)"
                className="w-full bg-[#1a1a24] border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <button disabled={loading || !decisionId.trim()} type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {loading ? 'Searching...' : 'Fetch Replay'}
            </button>
          </form>
        </div>

        {error && <div className="text-red-400 p-4 bg-red-500/10 rounded-lg border border-red-500/20 text-sm">{error}</div>}

        {!data && !error && !loading && (
          <div className="p-12 text-center border border-gray-800/60 rounded-xl bg-[#12121a] text-gray-500">
            <ArrowRight className="w-8 h-8 mx-auto mb-4 opacity-50" />
            <p>Select a decision from the ledger or enter an ID to replay its evaluation logic.</p>
          </div>
        )}

        {data && (
          <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-200">Replay Results</h4>
              <ExplainButton context={`CASA Decision Replay for ${decisionId}`} data={data} />
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
                <div className="text-xs text-gray-500 font-mono mb-1">TIMESTAMP</div>
                <div className="text-sm text-gray-200">{new Date(data.timestamp).toLocaleString()}</div>
              </div>
              <div className="p-4 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
                <div className="text-xs text-gray-500 font-mono mb-1">POLICY APPLIED</div>
                <div className="text-lg font-medium text-blue-400 font-mono">{data.policyApplied}</div>
              </div>
              <div className="p-4 bg-[#0a0a0c] rounded-lg border border-gray-800/60">
                <div className="text-xs text-gray-500 font-mono mb-1">ORIGINAL OUTCOME</div>
                <div className={`text-lg font-medium capitalize ${data.originalOutcome === 'ALLOW' ? 'text-emerald-400' : data.originalOutcome === 'HALT' ? 'text-red-400' : 'text-amber-400'}`}>
                  {data.originalOutcome}
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-gray-800/60">
              <div className="text-xs text-gray-500 font-mono mb-3 uppercase tracking-wider">Execution Context</div>
              <pre className="bg-[#0a0a0c] p-4 rounded-lg text-xs text-gray-400 overflow-x-auto border border-gray-800/60 font-mono">
                {JSON.stringify(data.context, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
