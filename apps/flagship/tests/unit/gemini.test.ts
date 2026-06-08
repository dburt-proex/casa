import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const sendMessageMock = vi.fn();
const getHistoryMock = vi.fn();
const generateContentMock = vi.fn();
const backendBridgeMocks = {
  getDashboard: vi.fn(),
  getBoundaryStress: vi.fn(),
  runDryRun: vi.fn(),
  replayDecision: vi.fn(),
};

function resetGeminiMocks() {
  sendMessageMock.mockReset();
  getHistoryMock.mockReset();
  generateContentMock.mockReset();
  backendBridgeMocks.getDashboard.mockReset();
  backendBridgeMocks.getBoundaryStress.mockReset();
  backendBridgeMocks.runDryRun.mockReset();
  backendBridgeMocks.replayDecision.mockReset();
}

async function loadGeminiModule(env: Record<string, string | undefined> = {}) {
  vi.resetModules();

  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    ...env,
  };

  delete process.env.REDIS_URL;

  vi.doMock('../../src/server/services/backendBridge.js', () => ({
    backendBridge: backendBridgeMocks,
  }));

  vi.doMock('../../src/server/services/opsMetrics.js', () => ({
    opsMetrics: {
      recordToolCall: vi.fn(),
      recordTokenUsage: vi.fn(),
    },
  }));

  vi.doMock('ioredis', () => ({
    default: class RedisMock {},
  }));

  vi.doMock('@google/genai', () => ({
    GoogleGenAI: class {
      chats = {
        create: () => ({
          sendMessage: sendMessageMock,
          getHistory: getHistoryMock,
        }),
      };

      models = {
        generateContent: generateContentMock,
      };

      constructor(_config: unknown) {}
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
    },
    Content: class {},
  }));

  return import('../../src/server/services/gemini.js');
}

afterEach(() => {
  resetGeminiMocks();
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe('geminiService', () => {
  it('fails fast when the Gemini API key is missing', async () => {
    resetGeminiMocks();
    const { geminiService } = await loadGeminiModule({ GEMINI_API_KEY: '' });

    expect(geminiService.getConfigStatus()).toEqual({
      geminiConfigured: false,
      canonicalGeminiConfigured: false,
      legacyGeminiConfigured: false,
    });
    await expect(geminiService.handleChat('session-1', 'hello')).rejects.toThrow(
      'AI explanation is unavailable until GEMINI_API_KEY is configured.'
    );
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('normalizes invalid API key failures into a configuration error', async () => {
    resetGeminiMocks();
    sendMessageMock.mockRejectedValueOnce(new Error('API key not valid. Please pass a valid API key.'));
    getHistoryMock.mockResolvedValue([]);

    const { geminiService } = await loadGeminiModule({ GEMINI_API_KEY: 'valid-looking-key' });

    await expect(geminiService.handleChat('session-2', 'hello', 'req-123')).rejects.toThrow(
      'AI Service configuration error: Missing or invalid GEMINI_API_KEY. Please configure it in the Settings menu.'
    );
  });

  it('returns a safe fallback when tool recursion exceeds the limit', async () => {
    resetGeminiMocks();
    sendMessageMock
      .mockResolvedValueOnce({
        functionCalls: [{ id: 'call-1', name: 'fetchDashboard', args: {} }],
        text: '',
      })
      .mockResolvedValueOnce({
        functionCalls: [{ id: 'call-2', name: 'fetchBoundaryStress', args: {} }],
        text: '',
      })
      .mockResolvedValueOnce({
        functionCalls: [{ id: 'call-3', name: 'fetchDashboard', args: {} }],
        text: '',
      });
    getHistoryMock.mockResolvedValue([]);
    backendBridgeMocks.getDashboard.mockResolvedValue({
      activePolicies: 1,
      decisions24h: 2,
      boundaryAlerts: 0,
      systemStatus: 'healthy',
    });
    backendBridgeMocks.getBoundaryStress.mockResolvedValue({
      stressLevel: 10,
      criticalBoundaries: [],
      recommendations: ['Stable'],
    });

    const { geminiService } = await loadGeminiModule({ GEMINI_API_KEY: 'valid-looking-key' });

    await expect(geminiService.handleChat('session-3', 'show me the dashboard')).resolves.toBe(
      'The AI service stopped after too many tool calls. Please refine your request and try again.'
    );
    expect(sendMessageMock).toHaveBeenCalledTimes(3);
    expect(backendBridgeMocks.getDashboard).toHaveBeenCalledOnce();
    expect(backendBridgeMocks.getBoundaryStress).toHaveBeenCalledOnce();
  });
});
