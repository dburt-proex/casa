import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { ShieldAlert, CheckCircle, XCircle, AlertTriangle, RefreshCw, CalendarDays, ArrowRight } from 'lucide-react';
import { ExplainButton } from '../../components/ExplainButton';
import { useAuth } from '../../contexts/AuthContext';
import type { GovernanceSprint } from '../../types';

type ReviewGateProps = {
  onOpenSprintWorkspace?: (sprintId: string) => void;
};

export function ReviewGate({ onOpenSprintWorkspace }: ReviewGateProps) {
  const { isAdmin } = useAuth();
  const [flagged, setFlagged] = useState<any[]>([]);
  const [sprints, setSprints] = useState<GovernanceSprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sprintError, setSprintError] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [creatingSprintId, setCreatingSprintId] = useState<string | null>(null);
  const [recentReviews, setRecentReviews] = useState<Array<{ id: string; action: string; finalDecision?: string; notes: string; reviewedAt: string }>>([]);

  const sprintByDecisionId = useMemo(() => {
    return new Map(sprints.map((sprint) => [sprint.decisionId, sprint]));
  }, [sprints]);

  const fetchFlagged = async () => {
    setLoading(true);
    setError('');
    setSprintError('');
    try {
      const data = await api.get('/decisions/flagged') as any;
      setFlagged(data);
      try {
        const sprintData = await api.get<GovernanceSprint[]>('/governance-sprints');
        setSprints(sprintData);
      } catch (err: any) {
        setSprintError(err.message || 'Failed to load linked governance sprints');
      }
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
    if (!isAdmin) return;
    setReviewingId(id);
    try {
      const notes = reviewNotes[id]?.trim() || `Reviewed from CASA Flagship as ${action}`;
      const result = await api.post<any>(`/decisions/${id}/review`, {
        action,
        notes
      });
      setRecentReviews((current) => [
        {
          id,
          action,
          finalDecision: result.final_decision || result.finalDecision,
          notes,
          reviewedAt: new Date().toISOString(),
        },
        ...current.slice(0, 4),
      ]);
      setReviewNotes((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      await fetchFlagged();
    } catch (err: any) {
      alert(`Failed to ${action}: ${err.message}`);
    } finally {
      setReviewingId(null);
    }
  };

  const handleCreateSprint = async (decision: any) => {
    setCreatingSprintId(decision.id);
    setSprintError('');
    try {
      const sprint = await api.post<GovernanceSprint>('/governance-sprints', {
        decisionId: decision.id,
        workflowSummary: decision.action || `Review decision ${decision.id}`,
        durationDays: 7,
        source: 'review_gate',
        notes: 'Created from Review Gate pending decision.',
        decisionSnapshot: decision,
      });
      setSprints((current) => {
        const withoutExisting = current.filter((item) => item.id !== sprint.id && item.decisionId !== sprint.decisionId);
        return [sprint, ...withoutExisting];
      });
    } catch (err: any) {
      setSprintError(err.message || 'Failed to create governance sprint');
    } finally {
      setCreatingSprintId(null);
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Timestamp unavailable';
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
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
        <button
          onClick={fetchFlagged}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-700/60 bg-[#12121a] px-3 py-2 text-xs text-gray-300 hover:border-emerald-500/30 hover:text-emerald-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {!isAdmin && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Read-only client demo mode: operators can inspect review evidence, but only admins can approve or halt decisions.
        </div>
      )}

      {sprintError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {sprintError}
        </div>
      )}

      {recentReviews.length > 0 && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="text-sm font-medium text-emerald-200">Recent review history</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentReviews.map((review) => (
              <div key={`${review.id}-${review.reviewedAt}`} className="rounded-lg border border-emerald-500/15 bg-[#0a0a0c] p-3 text-xs text-gray-300">
                <div className="font-mono text-emerald-300">{review.id}</div>
                <div className="mt-1">{review.action} recorded as {review.finalDecision || 'reviewed'}</div>
                <div className="mt-1 text-gray-500">{formatTimestamp(review.reviewedAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {flagged.length === 0 ? (
        <div className="p-12 text-center border border-gray-800/60 rounded-xl bg-[#12121a] text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500/50" />
          <p>No decisions currently require human intervention.</p>
          <p className="mt-2 text-sm text-gray-600">Run a Workflow Intake scenario that returns REVIEW to populate this queue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flagged.map(decision => {
            const linkedSprint = sprintByDecisionId.get(decision.id);
            return (
            <div key={decision.id} className="p-6 rounded-xl bg-[#12121a] border border-amber-500/20 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-medium text-gray-200">{decision.id}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                      PENDING REVIEW
                    </span>
                    {linkedSprint && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-xs font-medium border border-emerald-500/20">
                        {linkedSprint.status} SPRINT
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 font-mono">{formatTimestamp(decision.timestamp)}</div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {linkedSprint ? (
                    <button
                      type="button"
                      onClick={() => onOpenSprintWorkspace?.(linkedSprint.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/15"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      Open Sprint
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCreateSprint(decision)}
                      disabled={creatingSprintId === decision.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-50"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                      {creatingSprintId === decision.id ? 'Creating...' : 'Create Sprint'}
                    </button>
                  )}
                  <ExplainButton context={`Review Gate Decision ${decision.id}`} data={decision} />
                </div>
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
                    <AlertTriangle className={`w-4 h-4 ${decision.risk === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'}`} />
                    <span className={`text-sm font-bold ${decision.risk === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>
                      {decision.risk || decision.liabilityGrade}
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
                {decision.riskFactors?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {decision.riskFactors.slice(0, 4).map((factor: string) => (
                      <span key={factor} className="rounded-full border border-gray-700 bg-[#0a0a0c] px-2.5 py-1 text-xs text-gray-400">
                        {factor}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-mono text-gray-500 mb-2">REVIEW NOTES</label>
                <textarea
                  value={reviewNotes[decision.id] || ''}
                  onChange={(event) => setReviewNotes((current) => ({ ...current, [decision.id]: event.target.value }))}
                  disabled={!isAdmin}
                  placeholder={isAdmin ? 'Add the reason for approve/halt before recording the review.' : 'Admin access required to record review notes.'}
                  className="min-h-20 w-full rounded-lg border border-gray-800/60 bg-[#0a0a0c] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-800/60">
                <button
                  onClick={() => handleReview(decision.id, 'HALT')}
                  disabled={!isAdmin || reviewingId === decision.id}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {isAdmin ? 'Halt Action' : 'Admin Only'}
                </button>
                <button
                  onClick={() => handleReview(decision.id, 'APPROVE')}
                  disabled={!isAdmin || reviewingId === decision.id}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isAdmin ? 'Approve Action' : 'Admin Only'}
                </button>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
