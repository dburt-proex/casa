# Compliance Program v0.1

Status: INTERNAL READINESS BASELINE — NOT CERTIFICATION
Owner: Operator / Governance
Scope: CASA, Runwall, DiffWall, Operator Intelligence, VIL, Mirdexx, PromptBP and shared decision/evidence interfaces.

## Claim boundary

No project may claim ISO/IEC 27001 certification, ISO/IEC 42001 certification, or SOC 2 attestation unless the corresponding independent process has been completed. Repository evidence may support only bounded claims such as mapped, aligned, implemented, internally assessed, verified, or readiness-assessed when the underlying evidence supports that wording.

## Program objective

Operate one control system across multiple frameworks. Framework requirements map to canonical controls; controls map to repository implementations; implementations map to tests and evidence; evidence maps to review, remediation and retest records.

Invariant: REQUIREMENT -> CONTROL -> IMPLEMENTATION -> TEST -> EVIDENCE -> REVIEW -> REMEDIATION -> RETEST.

A control is not VERIFIED without qualifying evidence. A control is not considered operating merely because documentation exists.

## Framework scope

Primary: ISO/IEC 27001:2022; ISO/IEC 42001:2023; SOC 2 Trust Services Criteria.
Supporting: NIST AI RMF 1.0. Additional mappings require explicit versioning and review.

## System roles

- CASA: governance authority, policy/gate decisions, audit decisions.
- Runwall: runtime authorization and execution boundary.
- DiffWall: change-time enforcement and CI evidence.
- Operator Intelligence: assessment, evidence graph and control-effectiveness evaluation.
- VIL: deterministic scoring and risk measurement.
- Mirdexx: evidence provenance, source registry and event records.
- PromptBP: instruction/capability contracts and bounded execution policy.
- Shared ledger interfaces: decision, approval, execution, exception and verification receipts.

## Required control states

NOT_APPLICABLE | MISSING | PARTIAL | IMPLEMENTED | VERIFIED

VERIFIED requires an identified implementation, repeatable test or review procedure, retained evidence, and a recorded verification result.

## Review gates

ALLOW: read-only inventory, mapping, documentation, evidence collection, non-destructive tests.
REVIEW: auth/permission changes, persistence changes, framework claim changes, risk acceptance, exceptions, CI enforcement changes.
HALT: unsupported certification/attestation claims, destructive evidence changes, secret exposure, bypass of mandatory governance gates, fabricated test/evidence results.

## Evidence minimum

Each retained evidence record should identify: evidence_id, control_id, source, system, artifact/version/hash where available, generated_at, test_or_review, result, reviewer/actor, policy_version where applicable, and retention/location reference.

## Internal audit rule

Internal readiness findings are evidence-based and may not be upgraded from MISSING/PARTIAL/IMPLEMENTED to VERIFIED without sufficient evidence. Unknowns remain open findings.

## External assurance gate

External certification/attestation is Phase 10. Entry requires completion of the internal readiness assessment, corrective-action register, evidence baseline, and management/operator review. External assessors remain the authority for certification/attestation outcomes.