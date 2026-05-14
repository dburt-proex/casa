/**
 * Unit tests for fetchWithTimeout error paths and the applyPolicy stub in
 * src/server/services/backendBridge.ts.
 *
 * Strategy: mock global.fetch to simulate:
 *  - Request timeouts (AbortError)
 *  - Non-OK HTTP responses
 *  - Oversized Content-Length header
 *  - Oversized response body text
 * The applyPolicy method is a compile-time stub that always throws.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backendBridge } from '../../src/server/services/backendBridge.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchResponse(overrides: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  contentLength?: string | null;
  body?: unknown;
}): void {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    contentLength = null,
    body = {},
  } = overrides;

  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      statusText,
      headers: { get: (name: string) => (name === 'content-length' ? contentLength : null) },
      text: async () => JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// fetchWithTimeout — timeout (AbortError)
// ---------------------------------------------------------------------------

describe('fetchWithTimeout — timeout', () => {
  it('throws a timeout error when the request is aborted', async () => {
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    await expect(backendBridge.getDashboard()).rejects.toThrow(/Timeout/i);
  });
});

// ---------------------------------------------------------------------------
// fetchWithTimeout — non-OK response
// ---------------------------------------------------------------------------

describe('fetchWithTimeout — non-OK HTTP status', () => {
  it('throws Backend Bridge Error on a 500 response', async () => {
    mockFetchResponse({ ok: false, status: 500, statusText: 'Internal Server Error' });
    await expect(backendBridge.getDashboard()).rejects.toThrow('Backend Bridge Error: 500 Internal Server Error');
  });

  it('throws Backend Bridge Error on a 404 response', async () => {
    mockFetchResponse({ ok: false, status: 404, statusText: 'Not Found' });
    await expect(backendBridge.getBoundaryStress()).rejects.toThrow('Backend Bridge Error: 404 Not Found');
  });

  it('throws Backend Bridge Error on a 401 response', async () => {
    mockFetchResponse({ ok: false, status: 401, statusText: 'Unauthorized' });
    await expect(
      backendBridge.runDryRun({ policyId: 'P', parameters: { policy_candidate_path: 'policy-candidates/P.json' }, environment: 'staging' })
    ).rejects.toThrow('Backend Bridge Error: 401 Unauthorized');
  });
});

// ---------------------------------------------------------------------------
// fetchWithTimeout — payload too large (Content-Length header)
// ---------------------------------------------------------------------------

describe('fetchWithTimeout — oversized Content-Length', () => {
  it('throws payload too large error when Content-Length exceeds 5MB', async () => {
    const fiveMbPlusOne = String(5 * 1024 * 1024 + 1);
    mockFetchResponse({ contentLength: fiveMbPlusOne });
    await expect(backendBridge.getDashboard()).rejects.toThrow(/payload too large/i);
  });

  it('does not throw when Content-Length is exactly 5MB', async () => {
    const exactlyFiveMb = String(5 * 1024 * 1024);
    mockFetchResponse({ contentLength: exactlyFiveMb, body: { status: 'healthy', activePolicies: 0, decisions24h: 0, boundaryAlerts: 0 } });
    // Should not throw due to content-length header (text body is small)
    await expect(backendBridge.getDashboard()).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// fetchWithTimeout — payload too large (response body text)
// ---------------------------------------------------------------------------

describe('fetchWithTimeout — oversized response body text', () => {
  it('throws payload too large error when response text exceeds 5MB', async () => {
    const huge = 'x'.repeat(5 * 1024 * 1024 + 1);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        text: async () => huge,
      })
    );
    await expect(backendBridge.getDashboard()).rejects.toThrow(/payload too large/i);
  });
});

// ---------------------------------------------------------------------------
// applyPolicy — compile-time stub
// ---------------------------------------------------------------------------

describe('backendBridge.applyPolicy', () => {
  it('always throws a not-yet-implemented error', async () => {
    await expect(backendBridge.applyPolicy('POL-X', 'test reason')).rejects.toThrow(
      /does not yet expose admin policy apply/i
    );
  });
});
