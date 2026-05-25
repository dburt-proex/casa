import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, RefreshCw, Save, ShieldAlert } from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import type {
  GovernanceSprint,
  GovernanceSprintChecklistItem,
  GovernanceSprintPhase,
  GovernanceSprintStatus,
} from '../../types';

const phases: GovernanceSprintPhase[] = ['Intake', 'Workflow Map', 'Controls', 'Review Gate', 'Evidence', 'Handoff'];
const statuses: GovernanceSprintStatus[] = ['REQUESTED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

function statusStyle(status: GovernanceSprintStatus) {
  if (status === 'ACTIVE') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'REQUESTED') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  if (status === 'COMPLETED') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  return 'border-gray-700 bg-gray-800/40 text-gray-400';
}

function formatDate(value?: string) {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function decisionField(sprint: GovernanceSprint, field: string) {
  const snapshot = sprint.decisionSnapshot || {};
  const result = snapshot.result as Record<string, unknown> | undefined;
  return String(result?.[field] ?? snapshot[field] ?? '');
}

type SprintWorkspaceProps = {
  selectedSprintId?: string | null;
};

export function SprintWorkspace({ selectedSprintId }: SprintWorkspaceProps) {
  const { isAdmin } = useAuth();
  const [sprints, setSprints] = useState<GovernanceSprint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(selectedSprintId || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draftStatus, setDraftStatus] = useState<GovernanceSprintStatus>('REQUESTED');
  const [draftPhase, setDraftPhase] = useState<GovernanceSprintPhase>('Intake');
  const [draftOwner, setDraftOwner] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftChecklist, setDraftChecklist] = useState<GovernanceSprintChecklistItem[]>([]);

  const selected = useMemo(
    () => sprints.find((sprint) => sprint.id === selectedId) || sprints[0] || null,
    [selectedId, sprints],
  );

  const loadSprints = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<GovernanceSprint[]>('/governance-sprints');
      setSprints(data);
      setSelectedId((current) => {
        if (selectedSprintId && data.some((sprint) => sprint.id === selectedSprintId)) return selectedSprintId;
        if (current && data.some((sprint) => sprint.id === current)) return current;
        return data[0]?.id || null;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load governance sprints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSprints();
  }, []);

  useEffect(() => {
    if (selectedSprintId) setSelectedId(selectedSprintId);
  }, [selectedSprintId]);

  useEffect(() => {
    if (!selected) return;
    setDraftStatus(selected.status);
    setDraftPhase(selected.phase);
    setDraftOwner(selected.owner || '');
    setDraftNotes(selected.notes || '');
    setDraftChecklist(selected.checklist || []);
  }, [selected]);

  const saveSprint = async () => {
    if (!selected || !isAdmin) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api.patch<GovernanceSprint>(`/governance-sprints/${selected.id}`, {
        status: draftStatus,
        phase: draftPhase,
        owner: draftOwner.trim() || null,
        notes: draftNotes,
        checklist: draftChecklist,
      });
      setSprints((current) => current.map((sprint) => (sprint.id === updated.id ? updated : sprint)));
    } catch (err: any) {
      setError(err.message || 'Failed to save governance sprint');
    } finally {
      setSaving(false);
    }
  };

  const toggleChecklist = (itemId: string) => {
    if (!isAdmin) return;
    setDraftChecklist((current) => current.map((item) => (
      item.id === itemId ? { ...item, complete: !item.complete } : item
    )));
  };

  const completedCount = draftChecklist.filter((item) => item.complete).length;
  const decision = selected ? decisionField(selected, 'decision') : '';
  const reason = selected ? decisionField(selected, 'reason') : '';
  const risk = selected ? decisionField(selected, 'risk') : '';

  if (loading) return <div className="text-gray-400 animate-pulse">Loading governance sprints...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-100 tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-emerald-400" />
            Governance Sprint Workspace
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Convert a governed decision into a 7-14 day implementation track with controls, evidence, review ownership, and handoff progress.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSprints}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-700/60 bg-[#12121a] px-3 py-2 text-xs text-gray-300 hover:border-emerald-500/30 hover:text-emerald-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      {!isAdmin && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Read-only client demo mode: operators can request and view sprints, but only admins can activate, advance, complete, or cancel them.
        </div>
      )}

      {sprints.length === 0 ? (
        <div className="rounded-xl border border-gray-800/60 bg-[#12121a] p-12 text-center text-gray-500">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-emerald-500/50" />
          <p>No governance sprints have been requested yet.</p>
          <p className="mt-2 text-sm text-gray-600">Run Workflow Intake, then create a sprint from the decision result.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-3">
            {sprints.map((sprint) => (
              <button
                key={sprint.id}
                type="button"
                onClick={() => setSelectedId(sprint.id)}
                className={cn(
                  'w-full rounded-xl border bg-[#12121a] p-4 text-left transition-colors hover:border-emerald-500/30',
                  selected?.id === sprint.id ? 'border-emerald-500/30' : 'border-gray-800/60',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-200">{sprint.workflowSummary}</div>
                    <div className="mt-1 text-xs font-mono text-gray-500">{sprint.id}</div>
                  </div>
                  <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', statusStyle(sprint.status))}>
                    {sprint.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>Phase<br /><span className="text-gray-300">{sprint.phase}</span></div>
                  <div>Due<br /><span className="text-gray-300">{formatDate(sprint.dueAt)}</span></div>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-800/60 bg-[#12121a] p-6 shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-gray-100">{selected.workflowSummary}</h3>
                      <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', statusStyle(selected.status))}>
                        {selected.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-mono text-gray-500">{selected.id} - linked decision {selected.decisionId}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-right text-xs text-gray-500">
                    <div>Duration<br /><span className="text-gray-200">{selected.durationDays} days</span></div>
                    <div>Due<br /><span className="text-gray-200">{formatDate(selected.dueAt)}</span></div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-6 gap-2">
                  {phases.map((phase, index) => {
                    const activeIndex = phases.indexOf(draftPhase);
                    const isComplete = index < activeIndex || selected.status === 'COMPLETED';
                    const isActive = phase === draftPhase && selected.status !== 'COMPLETED';
                    return (
                      <div
                        key={phase}
                        className={cn(
                          'rounded-lg border px-3 py-3 text-center text-xs',
                          isActive && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
                          isComplete && 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200',
                          !isActive && !isComplete && 'border-gray-800 bg-[#0a0a0c] text-gray-500',
                        )}
                      >
                        <div className="font-semibold">{phase}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-xl border border-gray-800/60 bg-[#12121a] p-6 shadow-lg space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-gray-300">Sprint Controls</h3>
                    <span className="text-xs text-gray-500">{completedCount}/{draftChecklist.length} complete</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-2 text-sm">
                      <span className="text-gray-400">Status</span>
                      <select
                        disabled={!isAdmin}
                        value={draftStatus}
                        onChange={(event) => setDraftStatus(event.target.value as GovernanceSprintStatus)}
                        className="w-full rounded-lg border border-gray-800 bg-[#0a0a0c] px-3 py-2 text-gray-100 disabled:opacity-60"
                      >
                        {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="text-gray-400">Phase</span>
                      <select
                        disabled={!isAdmin}
                        value={draftPhase}
                        onChange={(event) => setDraftPhase(event.target.value as GovernanceSprintPhase)}
                        className="w-full rounded-lg border border-gray-800 bg-[#0a0a0c] px-3 py-2 text-gray-100 disabled:opacity-60"
                      >
                        {phases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                      </select>
                    </label>
                  </div>

                  <label className="space-y-2 text-sm block">
                    <span className="text-gray-400">Owner</span>
                    <input
                      disabled={!isAdmin}
                      value={draftOwner}
                      onChange={(event) => setDraftOwner(event.target.value)}
                      placeholder="admin@example.com"
                      className="w-full rounded-lg border border-gray-800 bg-[#0a0a0c] px-3 py-2 text-gray-100 placeholder:text-gray-600 disabled:opacity-60"
                    />
                  </label>

                  <label className="space-y-2 text-sm block">
                    <span className="text-gray-400">Notes</span>
                    <textarea
                      disabled={!isAdmin}
                      value={draftNotes}
                      onChange={(event) => setDraftNotes(event.target.value)}
                      placeholder="Add sprint context, client constraints, or handoff notes."
                      className="min-h-28 w-full rounded-lg border border-gray-800 bg-[#0a0a0c] px-3 py-2 text-gray-100 placeholder:text-gray-600 disabled:opacity-60"
                    />
                  </label>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={saveSprint}
                      disabled={saving}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving Sprint...' : 'Save Sprint Updates'}
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-gray-800/60 bg-[#12121a] p-6 shadow-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-300">Implementation Checklist</h3>
                  <div className="space-y-3">
                    {draftChecklist.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => toggleChecklist(item.id)}
                        className="flex w-full items-start gap-3 rounded-lg border border-gray-800/60 bg-[#0a0a0c] p-3 text-left disabled:cursor-default"
                      >
                        <CheckCircle2 className={cn('mt-0.5 h-4 w-4 shrink-0', item.complete ? 'text-emerald-400' : 'text-gray-700')} />
                        <span className={cn('text-sm', item.complete ? 'text-gray-300 line-through decoration-gray-600' : 'text-gray-200')}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-xl border border-gray-800/60 bg-[#12121a] p-6 shadow-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    Linked Decision Evidence
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono text-gray-400">
                    <div className="rounded-lg border border-gray-800/60 bg-[#0a0a0c] p-3">Decision<br /><span className="text-gray-100">{decision || 'unknown'}</span></div>
                    <div className="rounded-lg border border-gray-800/60 bg-[#0a0a0c] p-3">Risk<br /><span className="text-gray-100">{risk || 'unknown'}</span></div>
                  </div>
                  <div className="rounded-lg border border-gray-800/60 bg-[#0a0a0c] p-4 text-sm text-gray-300">
                    {reason || 'No deterministic reason was captured in this sprint snapshot.'}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-800/60 bg-[#12121a] p-6 shadow-lg space-y-4">
                  <h3 className="text-sm font-medium text-gray-300">Evidence Items</h3>
                  <div className="space-y-2">
                    {selected.evidence.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-800/60 bg-[#0a0a0c] p-3">
                        <div className="text-xs font-mono text-gray-500">{item.label}</div>
                        <div className="mt-1 text-sm text-gray-200">{item.value || 'Captured'}</div>
                      </div>
                    ))}
                    <div className="rounded-lg border border-gray-800/60 bg-[#0a0a0c] p-3">
                      <div className="text-xs font-mono text-gray-500">Created by</div>
                      <div className="mt-1 text-sm text-gray-200">{selected.createdBy} ({selected.createdByRole})</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
