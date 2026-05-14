import React, { useState } from 'react';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react';
import { Activity, Shield, History, Play, MessageSquare, AlertTriangle, LogOut, ShieldAlert, Terminal, ClipboardList } from 'lucide-react';
import { cn } from './lib/utils';
import { PolicyLab } from './features/policy-lab/PolicyLab';
import { OperatorChat } from './features/chat/OperatorChat';
import { Dashboard } from './features/dashboard/Dashboard';
import { BoundaryStress } from './features/stress/BoundaryStress';
import { DecisionReplay } from './features/replay/DecisionReplay';
import { ReviewGate } from './features/review/ReviewGate';
import { OpsMetricsView } from './components/OpsMetricsView';
import { WorkflowIntake } from './features/intake/WorkflowIntake';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated, login, logout } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const devLoginEnabled = import.meta.env.DEV;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-gray-300 font-sans">
        <div className="w-full max-w-md p-8 bg-[#0d0d12] border border-gray-800/60 rounded-xl shadow-2xl">
          <div className="flex items-center justify-center gap-3 text-blue-400 font-semibold tracking-wide mb-8">
            <Shield className="w-8 h-8" />
            <span className="text-xl">CASA CONTROL</span>
          </div>
          <h2 className="text-center text-gray-400 mb-8">Operator Authentication Required</h2>

          <div className="space-y-4">
            {clerkEnabled ? (
              <>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">Sign in</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-medium">Create account</button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <div className="flex justify-center">
                    <UserButton />
                  </div>
                </Show>
              </>
            ) : devLoginEnabled ? (
              <>
                <button onClick={async () => { setIsLoggingIn(true); await login('operator'); setIsLoggingIn(false); }} disabled={isLoggingIn} className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50">Login as Operator</button>
                <button onClick={async () => { setIsLoggingIn(true); await login('admin'); setIsLoggingIn(false); }} disabled={isLoggingIn} className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-medium disabled:opacity-50">Login as Admin</button>
              </>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Authentication configuration required.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'intake': return <WorkflowIntake />;
      case 'dashboard': return <Dashboard />;
      case 'review': return <ReviewGate />;
      case 'dry-run': return <PolicyLab />;
      case 'analysis': return <BoundaryStress />;
      case 'history': return <DecisionReplay />;
      case 'chat': return <OperatorChat />;
      case 'ops': return <OpsMetricsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-gray-300 font-sans flex">
      <aside className="w-64 border-r border-gray-800/60 bg-[#0d0d12] flex flex-col z-10">
        <div className="p-6 border-b border-gray-800/60">
          <div className="flex items-center gap-3 text-blue-400 font-semibold tracking-wide">
            <Shield className="w-6 h-6" />
            <span>CASA CONTROL</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 font-mono">v2.0.0-rc2</div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'intake', icon: ClipboardList, label: 'Workflow Intake' },
            { id: 'dashboard', icon: Activity, label: 'System Dashboard' },
            { id: 'review', icon: ShieldAlert, label: 'Review Gate' },
            { id: 'dry-run', icon: Play, label: 'Policy Lab' },
            { id: 'analysis', icon: AlertTriangle, label: 'Boundary Stress' },
            { id: 'history', icon: History, label: 'Audit Ledger' },
            { id: 'chat', icon: MessageSquare, label: 'Operator Chat' },
            { id: 'ops', icon: Terminal, label: 'Ops Metrics' },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium", activeTab === item.id ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200")}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800/60">
          {clerkEnabled && (
            <Show when="signed-in">
              <div className="mb-3 flex items-center justify-center">
                <UserButton />
              </div>
            </Show>
          )}
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-400 hover:bg-gray-800/50 hover:text-red-400">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">
        {renderContent()}
      </main>
    </div>
  );
}
