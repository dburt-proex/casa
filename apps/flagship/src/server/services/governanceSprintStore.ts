import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import type { z } from 'zod';
import type { AuthenticatedUser } from '../middleware/auth.js';
import {
  GovernanceSprintCreateSchema,
  GovernanceSprintUpdateSchema,
} from '../schemas/contracts.js';

export type GovernanceSprintStatus = 'REQUESTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type GovernanceSprintPhase = 'Intake' | 'Workflow Map' | 'Controls' | 'Review Gate' | 'Evidence' | 'Handoff';

export type GovernanceSprintChecklistItem = {
  id: string;
  label: string;
  complete: boolean;
};

export type GovernanceSprintEvidenceItem = {
  id: string;
  label: string;
  value?: string;
  href?: string;
  [key: string]: unknown;
};

export type GovernanceSprint = {
  id: string;
  decisionId: string;
  status: GovernanceSprintStatus;
  durationDays: 7 | 14;
  phase: GovernanceSprintPhase;
  workflowSummary: string;
  decisionSnapshot: Record<string, unknown>;
  owner: string | null;
  dueAt: string;
  notes: string;
  checklist: GovernanceSprintChecklistItem[];
  evidence: GovernanceSprintEvidenceItem[];
  createdBy: string;
  createdByRole: AuthenticatedUser['role'];
  createdAt: string;
  updatedAt: string;
};

type CreateSprintInput = z.infer<typeof GovernanceSprintCreateSchema>;
type UpdateSprintInput = z.infer<typeof GovernanceSprintUpdateSchema>;

const DEFAULT_CHECKLIST: GovernanceSprintChecklistItem[] = [
  { id: 'confirm-owner', label: 'Confirm workflow owner and success criteria', complete: false },
  { id: 'map-action', label: 'Map the AI action, data exposure, and execution boundary', complete: false },
  { id: 'define-controls', label: 'Define ALLOW / REVIEW / HALT control points', complete: false },
  { id: 'review-gate', label: 'Validate Review Gate ownership and human-review path', complete: false },
  { id: 'capture-evidence', label: 'Capture ledger evidence and decision reasons', complete: false },
  { id: 'handoff-report', label: 'Prepare final governance handoff report', complete: false },
];

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function createSprintId() {
  return `SPR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function actorIdentity(actor: AuthenticatedUser) {
  return actor.email || actor.sub || 'unknown-operator';
}

function dueDateFrom(now: Date, durationDays: 7 | 14) {
  const due = new Date(now);
  due.setUTCDate(due.getUTCDate() + durationDays);
  return due.toISOString();
}

function toSprint(row: any): GovernanceSprint {
  return {
    id: String(row.id),
    decisionId: String(row.decision_id ?? row.decisionId),
    status: String(row.status) as GovernanceSprintStatus,
    durationDays: Number(row.duration_days ?? row.durationDays) === 14 ? 14 : 7,
    phase: String(row.phase) as GovernanceSprintPhase,
    workflowSummary: String(row.workflow_summary ?? row.workflowSummary ?? ''),
    decisionSnapshot: row.decision_snapshot ?? row.decisionSnapshot ?? {},
    owner: row.owner ?? null,
    dueAt: new Date(row.due_at ?? row.dueAt).toISOString(),
    notes: String(row.notes ?? ''),
    checklist: row.checklist ?? [],
    evidence: row.evidence ?? [],
    createdBy: String(row.created_by ?? row.createdBy ?? ''),
    createdByRole: String(row.created_by_role ?? row.createdByRole ?? 'operator') as AuthenticatedUser['role'],
    createdAt: new Date(row.created_at ?? row.createdAt).toISOString(),
    updatedAt: new Date(row.updated_at ?? row.updatedAt).toISOString(),
  };
}

export class GovernanceSprintStore {
  private pool: pg.Pool | null = null;
  private initialized = false;

  private getPool() {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      if (isProduction()) {
        throw new Error('DATABASE_URL is required for durable governance sprint storage in production');
      }
      return null;
    }

    if (!this.pool) {
      this.pool = new pg.Pool({
        connectionString,
        ssl: connectionString.includes('render.com') ? { rejectUnauthorized: false } : undefined,
      });
    }
    return this.pool;
  }

  private getLocalPath() {
    return process.env.GOVERNANCE_SPRINT_STORE_PATH?.trim()
      || path.join(process.cwd(), '.local', 'governance-sprints.json');
  }

  private async ensureSchema() {
    if (this.initialized) return;
    const pool = this.getPool();
    if (!pool) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS governance_sprints (
        id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL,
        status TEXT NOT NULL,
        duration_days INTEGER NOT NULL,
        phase TEXT NOT NULL,
        workflow_summary TEXT NOT NULL,
        decision_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
        owner TEXT,
        due_at TIMESTAMPTZ NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
        evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by TEXT NOT NULL,
        created_by_role TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query('CREATE INDEX IF NOT EXISTS governance_sprints_decision_idx ON governance_sprints(decision_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS governance_sprints_status_idx ON governance_sprints(status)');
    this.initialized = true;
  }

  private async readLocal(): Promise<GovernanceSprint[]> {
    const localPath = this.getLocalPath();
    try {
      const text = await fs.readFile(localPath, 'utf8');
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.map(toSprint) : [];
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  private async writeLocal(sprints: GovernanceSprint[]) {
    const localPath = this.getLocalPath();
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, JSON.stringify(sprints, null, 2), 'utf8');
  }

  private buildSprint(input: CreateSprintInput, actor: AuthenticatedUser): GovernanceSprint {
    const now = new Date();
    const actorId = actorIdentity(actor);
    const status: GovernanceSprintStatus = actor.role === 'admin' ? 'ACTIVE' : 'REQUESTED';

    return {
      id: createSprintId(),
      decisionId: input.decisionId,
      status,
      durationDays: input.durationDays,
      phase: 'Intake',
      workflowSummary: input.workflowSummary,
      decisionSnapshot: input.decisionSnapshot,
      owner: actor.role === 'admin' ? actorId : null,
      dueAt: dueDateFrom(now, input.durationDays),
      notes: input.notes || '',
      checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item })),
      evidence: [
        {
          id: 'linked-decision',
          label: 'Linked governed decision',
          value: input.decisionId,
        },
      ],
      createdBy: actorId,
      createdByRole: actor.role,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  async createOrGet(input: CreateSprintInput, actor: AuthenticatedUser): Promise<{ sprint: GovernanceSprint; created: boolean }> {
    const parsed = GovernanceSprintCreateSchema.parse(input);
    const pool = this.getPool();

    if (pool) {
      await this.ensureSchema();
      const existing = await pool.query(
        'SELECT * FROM governance_sprints WHERE decision_id = $1 ORDER BY created_at DESC LIMIT 1',
        [parsed.decisionId],
      );
      if (existing.rows[0]) {
        return { sprint: toSprint(existing.rows[0]), created: false };
      }

      const sprint = this.buildSprint(parsed, actor);
      await pool.query(
        `INSERT INTO governance_sprints (
          id, decision_id, status, duration_days, phase, workflow_summary,
          decision_snapshot, owner, due_at, notes, checklist, evidence,
          created_by, created_by_role, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          sprint.id,
          sprint.decisionId,
          sprint.status,
          sprint.durationDays,
          sprint.phase,
          sprint.workflowSummary,
          sprint.decisionSnapshot,
          sprint.owner,
          sprint.dueAt,
          sprint.notes,
          sprint.checklist,
          sprint.evidence,
          sprint.createdBy,
          sprint.createdByRole,
          sprint.createdAt,
          sprint.updatedAt,
        ],
      );
      return { sprint, created: true };
    }

    const sprints = await this.readLocal();
    const existing = sprints.find((sprint) => sprint.decisionId === parsed.decisionId);
    if (existing) {
      return { sprint: existing, created: false };
    }

    const sprint = this.buildSprint(parsed, actor);
    await this.writeLocal([sprint, ...sprints]);
    return { sprint, created: true };
  }

  async list(): Promise<GovernanceSprint[]> {
    const pool = this.getPool();
    if (pool) {
      await this.ensureSchema();
      const result = await pool.query('SELECT * FROM governance_sprints ORDER BY updated_at DESC');
      return result.rows.map(toSprint);
    }

    return (await this.readLocal()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<GovernanceSprint | null> {
    const pool = this.getPool();
    if (pool) {
      await this.ensureSchema();
      const result = await pool.query('SELECT * FROM governance_sprints WHERE id = $1 LIMIT 1', [id]);
      return result.rows[0] ? toSprint(result.rows[0]) : null;
    }

    return (await this.readLocal()).find((sprint) => sprint.id === id) || null;
  }

  async update(id: string, input: UpdateSprintInput): Promise<GovernanceSprint | null> {
    const parsed = GovernanceSprintUpdateSchema.parse(input);
    const current = await this.get(id);
    if (!current) return null;

    const next: GovernanceSprint = {
      ...current,
      status: parsed.status ?? current.status,
      phase: parsed.phase ?? current.phase,
      owner: parsed.owner === undefined ? current.owner : parsed.owner,
      notes: parsed.notes ?? current.notes,
      checklist: parsed.checklist ?? current.checklist,
      evidence: parsed.evidence ?? current.evidence,
      updatedAt: new Date().toISOString(),
    };

    const pool = this.getPool();
    if (pool) {
      await this.ensureSchema();
      const result = await pool.query(
        `UPDATE governance_sprints SET
          status = $2,
          phase = $3,
          owner = $4,
          notes = $5,
          checklist = $6,
          evidence = $7,
          updated_at = $8
        WHERE id = $1
        RETURNING *`,
        [id, next.status, next.phase, next.owner, next.notes, next.checklist, next.evidence, next.updatedAt],
      );
      return result.rows[0] ? toSprint(result.rows[0]) : null;
    }

    const sprints = await this.readLocal();
    const nextSprints = sprints.map((sprint) => (sprint.id === id ? next : sprint));
    await this.writeLocal(nextSprints);
    return next;
  }
}

export const governanceSprintStore = new GovernanceSprintStore();
