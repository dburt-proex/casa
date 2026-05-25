import React, { useState } from 'react';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/react';
import { Activity, Shield, History, Play, MessageSquare, AlertTriangle, LogOut, ShieldAlert, Terminal, ClipboardList, UserCog, LockKeyhole } from 'lucide-react';
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
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isAuthenticated, login, logout, user, isAdmin, isAuthLoading, authError } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const devLoginEnabled = import.meta.env.DEV;
  const activeProfile = isAdmin
    ? {
        label: 'Admin profile active',
        shortLabel: 'Admin',
        summary: 'Full demo control',
        detail: 'Can run workflow intake, review decisions, execute admin dry-runs, and access protected admin actions.',
      }
    : {
        label: 'Operator profile active',
        shortLabel: 'Operator',
        summary: 'Read-only demo posture',
        detail: 'Can run workflow intake and view evidence, but cannot approve reviews or stage policy changes.',
      };
  const roleClasses = isAdmin
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-300';

  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0c] font-sans text-gray-300">
        <div className="w-full max-w-sm rounded-xl border border-gray-800/60 bg-[#0d0d12] p-8 text-center shadow-2xl">
          <Shield className="mx-auto h-9 w-9 text-emerald-400" />
          <div className="mt-5 text-sm font-medium text-gray-200">Finalizing secure session</div>
          <div className="mt-2 text-xs leading-5 text-gray-500">CASA is verifying your role and permissions.</div>
          <div className="mx-auto mt-6 h-1.5 w-28 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-gray-300 font-sans">
        <div className="w-full max-w-md p-8 bg-[#0d0d12] border border-gray-800/60 rounded-xl shadow-2xl">
          <div className="flex items-center justify-center gap-3 text-emerald-400 font-semibold tracking-wide mb-8">
            <Shield className="w-8 h-8" />
            <span className="text-xl">CASA CONTROL</span>
          </div>
          <h2 className="text-center text-gray-400 mb-8">Operator Authentication Required</h2>

          <div className="space-y-4">
            {authError && (
              <div className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <div>{authError}</div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-md border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-500/10"
                >
                  Retry session
                </button>
              </div>
            )}
            {clerkEnabled ? (
              <>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">Sign in</button>
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
                <button onClick={async () => { setIsLoggingIn(true); await login('operator'); setIsLoggingIn(false); }} disabled={isLoggingIn} className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium disabled:opacity-50">Login as Operator</button>
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
      case 'intake': return <WorkflowIntake onOpenReviewGate={() => setActiveTab('review')} />;
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
          <div className="flex items-center gap-3 text-emerald-400 font-semibold tracking-wide">
            <Shield className="w-6 h-6" />
            <span>CASA CONTROL</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 font-mono">v2.0.0-rc2</div>
          <div className={cn('mt-4 rounded-lg border px-3 py-3', roleClasses)}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {isAdmin ? <UserCog className="h-4 w-4 shrink-0" /> : <LockKeyhole className="h-4 w-4 shrink-0" />}
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wide">{activeProfile.label}</div>
                  <div className="mt-0.5 truncate text-xs text-gray-300">{user?.email || 'authenticated user'}</div>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-current/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {activeProfile.shortLabel}
              </span>
            </div>
            <div className="mt-2 text-[11px] leading-4 text-gray-400">
              {activeProfile.summary}
            </div>
          </div>
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
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium", activeTab === item.id ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200")}>
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
        <div className={cn('mb-6 rounded-lg border px-4 py-3', roleClasses)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {isAdmin ? <UserCog className="h-5 w-5 shrink-0" /> : <LockKeyhole className="h-5 w-5 shrink-0" />}
              <div className="min-w-0">
                <div className="text-sm font-semibold">{activeProfile.label}</div>
                <div className="mt-1 text-xs leading-5 text-gray-300">{activeProfile.detail}</div>
              </div>
            </div>
            <div className="rounded-full border border-current/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {user?.provider === 'dev' ? 'Local dev auth' : 'Clerk verified'}
            </div>
          </div>
        </div>
        <ErrorBoundary name={activeTab}>
          {renderContent()}
        </ErrorBoundary>
      </main>
    </div>
  );
}
