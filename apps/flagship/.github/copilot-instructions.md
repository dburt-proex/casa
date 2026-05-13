# CASA-Flagship Repository Instructions

This repository represents a governance-grade AI control plane and operator-facing system.

## Core mission
- Preserve the integrity of the CASA governance model.
- Keep control logic explicit, reviewable, and testable.
- Prefer narrow, reversible edits over broad architectural drift.

## System priorities
1. correctness
2. deterministic behavior
3. safety and bounded autonomy

## Required operating behavior
- Read context before writing code.
- Reuse patterns.
- Keep changes tight and reviewable.

## Risk controls
Treat policy logic, routing, schema, and env config as high-risk.

## Validation
- Always validate changes or state what is unverified.

## Output discipline
- list changes
- state validation
- state risks
