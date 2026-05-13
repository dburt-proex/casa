# CASA Tool Contracts Checklist

This document outlines the end-to-end contracts for the Gemini tools used in the CASA Operator Chat.

## 1. fetchDashboard
- **Expected input schema:** `{}` (Empty object)
- **Failure cases:** 
  - Backend API unreachable or times out
  - Backend returns 500 Internal Server Error
  - Backend returns payload that fails `DashboardSchema` validation
- **Expected response schema:** 
  ```json
  {
    "activePolicies": "number",
    "decisions24h": "number",
    "boundaryAlerts": "number",
    "systemStatus": "enum('healthy', 'degraded', 'critical')"
  }
  ```
- **Max payload size:** < 1KB
- **Auth expectations:** Internal server-to-server call. The operator must be authenticated on the Node layer to invoke the chat endpoint.
- **Safe fallback behavior:** Returns `{ "error": "Validation failed", "details": [...] }` or `{ "error": "Backend Bridge Error: ..." }` which the model consumes and reports to the user.

## 2. fetchBoundaryStress
- **Expected input schema:** `{}` (Empty object)
- **Failure cases:** 
  - Backend API unreachable or times out
  - Backend returns 500 Internal Server Error
  - Backend returns payload that fails `BoundaryStressSchema` validation
- **Expected response schema:** 
  ```json
  {
    "stressLevel": "number (0-100)",
    "criticalBoundaries": ["string"],
    "recommendations": ["string"]
  }
  ```
- **Max payload size:** < 2KB
- **Auth expectations:** Internal server-to-server call.
- **Safe fallback behavior:** Returns `{ "error": "Validation failed", "details": [...] }` or `{ "error": "Backend Bridge Error: ..." }`.

## 3. runPolicyDryRun
- **Expected input schema:** 
  ```json
  {
    "policyId": "string (required)",
    "environment": "enum('staging', 'production') (optional, defaults to 'staging')",
    "parameters": "object (optional)"
  }
  ```
- **Failure cases:** 
  - Missing or invalid `policyId`
  - Invalid `environment` value
  - Backend API unreachable or times out
  - Backend returns payload that fails `PolicyDryRunResponseSchema` validation
- **Expected response schema:** 
  ```json
  {
    "status": "string",
    "simulatedOutcome": "string",
    "impactScore": "number",
    "logs": ["string"]
  }
  ```
- **Max payload size:** < 10KB (depends on the number of logs)
- **Auth expectations:** Internal server-to-server call.
- **Safe fallback behavior:** Returns `{ "error": "Validation failed", "details": [...] }` or `{ "error": "Missing or invalid 'policyId' argument" }`.

## 4. replayDecision
- **Expected input schema:** 
  ```json
  {
    "decisionId": "string (required)"
  }
  ```
- **Failure cases:** 
  - Missing or invalid `decisionId`
  - Backend API unreachable or times out
  - Backend returns payload that fails `DecisionReplaySchema` validation
- **Expected response schema:** 
  ```json
  {
    "decisionId": "string",
    "timestamp": "string (ISO 8601)",
    "originalOutcome": "string",
    "policyApplied": "string",
    "context": "object"
  }
  ```
- **Max payload size:** < 10KB
- **Auth expectations:** Internal server-to-server call.
- **Safe fallback behavior:** Returns `{ "error": "Validation failed", "details": [...] }` or `{ "error": "Missing or invalid 'decisionId' argument" }`.
