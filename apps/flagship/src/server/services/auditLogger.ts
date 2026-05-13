import pg from 'pg';

type AuditEntry = {
  timestamp: string;
  action: string;
  policyId?: string;
  actorIdentity: string;
  actorEmail?: string;
  actorRole?: string;
  provider?: string;
  ip?: string;
  reason?: string;
  requestId?: string | string[];
};

class AuditLogger {
  private pool: pg.Pool | null = null;
  private initialized = false;

  private getPool() {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) return null;
    if (!this.pool) {
      this.pool = new pg.Pool({
        connectionString,
        ssl: connectionString.includes('render.com') ? { rejectUnauthorized: false } : undefined,
      });
    }
    return this.pool;
  }

  private async ensureSchema() {
    if (this.initialized) return;
    const pool = this.getPool();
    if (!pool) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id BIGSERIAL PRIMARY KEY,
        occurred_at TIMESTAMPTZ NOT NULL,
        action TEXT NOT NULL,
        policy_id TEXT,
        actor_identity TEXT NOT NULL,
        actor_email TEXT,
        actor_role TEXT,
        provider TEXT,
        ip TEXT,
        reason TEXT,
        request_id TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);
    this.initialized = true;
  }

  async record(entry: AuditEntry) {
    const pool = this.getPool();
    if (!pool) {
      console.info('[AUDIT LOG]', JSON.stringify(entry));
      return;
    }

    await this.ensureSchema();
    await pool.query(
      `INSERT INTO audit_events (
        occurred_at, action, policy_id, actor_identity, actor_email,
        actor_role, provider, ip, reason, request_id, payload
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        entry.timestamp,
        entry.action,
        entry.policyId || null,
        entry.actorIdentity,
        entry.actorEmail || null,
        entry.actorRole || null,
        entry.provider || null,
        entry.ip || null,
        entry.reason || null,
        Array.isArray(entry.requestId) ? entry.requestId.join(',') : entry.requestId || null,
        entry,
      ],
    );
  }
}

export const auditLogger = new AuditLogger();
