// ============================================================================
// Operational Metrics Tracker
// ============================================================================

export interface ToolCallRecord {
  id: string;
  timestamp: string;
  toolName: string;
  status: 'success' | 'error';
  latencyMs: number;
  errorType?: string;
  failedArguments?: string;
}

class OpsMetrics {
  private toolCalls: ToolCallRecord[] = [];
  private tokenUsage: Record<string, number> = {};
  private routeErrors: Record<string, number> = {};
  private routeRequests: Record<string, number> = {};
  
  // Keep only the last 100 tool calls in memory
  private MAX_HISTORY = 100;

  recordToolCall(record: Omit<ToolCallRecord, 'id' | 'timestamp'>) {
    const fullRecord: ToolCallRecord = {
      ...record,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    
    this.toolCalls.unshift(fullRecord);
    if (this.toolCalls.length > this.MAX_HISTORY) {
      this.toolCalls.pop();
    }
  }

  recordTokenUsage(feature: string, tokens: number) {
    if (!this.tokenUsage[feature]) this.tokenUsage[feature] = 0;
    this.tokenUsage[feature] += tokens;
  }

  recordRouteRequest(route: string) {
    if (!this.routeRequests[route]) this.routeRequests[route] = 0;
    this.routeRequests[route]++;
  }

  recordRouteError(route: string) {
    if (!this.routeErrors[route]) this.routeErrors[route] = 0;
    this.routeErrors[route]++;
  }

  getMetrics() {
    const recentCalls = this.toolCalls.slice(0, 20);
    
    const failuresByType: Record<string, number> = {};
    const failedArgsCount: Record<string, number> = {};
    let totalLatency = 0;
    let successfulCalls = 0;

    this.toolCalls.forEach(call => {
      if (call.status === 'error') {
        const type = call.errorType || 'unknown';
        failuresByType[type] = (failuresByType[type] || 0) + 1;
        
        if (call.failedArguments) {
          failedArgsCount[call.failedArguments] = (failedArgsCount[call.failedArguments] || 0) + 1;
        }
      } else {
        totalLatency += call.latencyMs;
        successfulCalls++;
      }
    });

    const averageLatency = successfulCalls > 0 ? Math.round(totalLatency / successfulCalls) : 0;

    const errorRates: Record<string, string> = {};
    Object.keys(this.routeRequests).forEach(route => {
      const requests = this.routeRequests[route];
      const errors = this.routeErrors[route] || 0;
      errorRates[route] = `${((errors / requests) * 100).toFixed(2)}%`;
    });

    // Sort failed args by frequency
    const mostCommonFailedArgs = Object.entries(failedArgsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([args, count]) => ({ args, count }));

    return {
      recentToolCalls: recentCalls,
      toolFailuresByType: failuresByType,
      averageResponseLatencyMs: averageLatency,
      tokenUsageByFeature: this.tokenUsage,
      errorRateByRoute: errorRates,
      mostCommonFailedArguments: mostCommonFailedArgs,
    };
  }
}

export const opsMetrics = new OpsMetrics();
