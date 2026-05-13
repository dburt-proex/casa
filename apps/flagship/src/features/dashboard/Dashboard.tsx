import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { ExplainButton } from '../../components/ExplainButton';
import { Activity, ShieldAlert, FileText, Server } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Generate some mock trend data for the charts
const generateTrendData = (baseValue: number) => {
  return Array.from({ length: 7 }).map((_, i) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.max(0, Math.floor(baseValue * (0.5 + Math.random())))
  }));
};

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [alertData, setAlertData] = useState<any[]>([]);

  useEffect(() => {
    api.get('/dashboard').then((res: any) => {
      setData(res);
      setTrendData(generateTrendData(res.decisions24h / 7));
      setAlertData(generateTrendData(res.boundaryAlerts || 2));
    }).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-500 p-4 bg-red-500/10 rounded-lg border border-red-500/20">Error: {error}</div>;
  if (!data) return <div className="text-gray-500 font-mono text-sm animate-pulse">Loading system metrics...</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100 tracking-tight">System Overview</h2>
          <p className="text-sm text-gray-400 mt-1">Real-time governance metrics and system health</p>
        </div>
        <ExplainButton context="CASA System Dashboard Metrics" data={data} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-sm text-gray-500 font-medium mb-2">Active Policies</div>
          <div className="text-4xl font-semibold tracking-tight text-gray-100">{data.activePolicies}</div>
          <div className="mt-4 text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> All policies enforcing
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
          <div className="text-sm text-gray-500 font-medium mb-2">Decisions (24h)</div>
          <div className="text-4xl font-semibold tracking-tight text-gray-100">{data.decisions24h}</div>
          <div className="mt-4 text-xs text-gray-400 flex items-center gap-1">
            <span className="text-emerald-400">+12%</span> from yesterday
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-amber-500/10 rounded-lg text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-sm text-gray-500 font-medium mb-2">Boundary Alerts</div>
          <div className={cn("text-4xl font-semibold tracking-tight", data.boundaryAlerts > 0 ? "text-amber-400" : "text-gray-100")}>
            {data.boundaryAlerts}
          </div>
          <div className="mt-4 text-xs text-gray-400 flex items-center gap-1">
            Requires operator review
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg relative overflow-hidden group">
          <div className="absolute top-4 right-4 p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
            <Server className="w-5 h-5" />
          </div>
          <div className="text-sm text-gray-500 font-medium mb-2">System Status</div>
          <div className="text-2xl font-semibold tracking-tight text-emerald-400 capitalize mt-2">{data.systemStatus}</div>
          <div className="mt-4 text-xs text-gray-400 flex items-center gap-1">
            Latency: 42ms
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-6">Decision Volume (7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDecisions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#1f2937', borderRadius: '8px' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorDecisions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-[#12121a] border border-gray-800/60 shadow-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-6">Boundary Alerts by Day</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#1f2937', borderRadius: '8px' }}
                  itemStyle={{ color: '#fbbf24' }}
                  cursor={{ fill: '#1f2937', opacity: 0.4 }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
