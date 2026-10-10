# Internal Compliance Readiness Assessment — 2026-08-16

Gate: REVIEW
Assurance status: NOT CERTIFIED / NOT ATTESTED
Assessment basis: repository-visible artifacts and controls inspected across CASA, Runwall, DiffWall, Operator Intelligence, VIL, Mirdexx and PromptBP. No production environment, organizational HR process, vendor contracts, backup system, external auditor evidence, or full operating-period evidence was available in this assessment.

## Executive result

The ecosystem has unusually strong technical governance primitives for an early-stage control environment: deterministic gates, bounded agent authority, runtime authorization, change-time enforcement, threat models, append-oriented ledgers, evidence graphs, CI workflows, scoring/evaluation surfaces and explicit anti-fabrication rules. These are useful implementation evidence.

The environment is not yet audit-ready for an ISO certification or SOC 2 examination because management-system and operational controls remain incomplete or unverified. The largest gaps are data governance, supplier/model-provider risk, business continuity/restore testing, formal incident-response lifecycle, organizational access reviews, formal risk treatment/acceptance records, operating-period evidence, and management/internal-audit cadence.

## Repository observations

### CASA
Observed: SECURITY.md; CI and DiffWall workflows; governed agent registry; explicit ALLOW/REVIEW/HALT authority boundaries; append-only ledger invariant; policy-version requirement; threat model with trust boundaries, execution-bypass, drift, evidence suppression, determinism and ledger-corruption threats; incident classes and SAFE_MODE escalation.
Assessment: strong implementation evidence for GOV-001, IAM-001, LOG-001 and SEC-001. INC-001 remains PARTIAL because a threat-model incident taxonomy is not equivalent to a complete organizational incident-response program.

### Runwall
Observed: CI; threat models; claims boundary; release gate; uninstrumented-path documentation; authorization, approvals, gate, policy, integrity, ledger, red-team and destructive/egress/injection/scope-escape modules.
Assessment: strong implementation surface for IAM-001, SEC-001 and LOG-001. Runtime control effectiveness and operating evidence require repeatable retained test receipts before VERIFIED.

### DiffWall
Observed: multiple CI/self-test/release-readiness workflows, security policy, CODEOWNERS/change evaluation surfaces, demo fixtures covering allow/review/halt change classes.
Assessment: strong implementation surface for CHG-001. Repository branch-protection and organizational review configuration were not established by this assessment; therefore control is IMPLEMENTED, not VERIFIED ecosystem-wide.

### Operator Intelligence
Observed: registry/map validation workflow; assessment-evidence graph; canonical models; policy and ledger components; representative assessment fixture; release workflow.
Assessment: strong basis for EVD-001 and REV-001, but formal internal-audit independence/cadence, exact framework test procedures and closed corrective-action evidence remain incomplete.

### VIL
Observed: deterministic scoring project with security/test/database-governance agent surfaces and destructive-action hook.
Assessment: useful RSK-001 measurement component. Formal enterprise risk register, treatment decisions, residual-risk acceptance and periodic review evidence are not yet established.

### Mirdexx
Observed: source registry, event ledger, database/configuration layer, CI tests, boundary-hardening and event-ledger tests, architecture documentation.
Assessment: strong EVD-001/LOG-001 implementation surface. Retention policy, access model, deletion policy and evidence lifecycle governance remain incomplete.

### PromptBP
Observed: bounded/block execution policy, capability registry/contracts, state schema, evaluation fixtures, failure policies, operational documentation and DiffWall workflow.
Assessment: useful GOV-001 and AI-001 governance inputs. AI inventory, lifecycle owner records, deployment monitoring and decommissioning evidence are not yet complete.

## Control status

| Control | Status | Confidence | Primary finding |
|---|---|---:|---|
| GOV-001 | IMPLEMENTED | High | Strong technical authority boundaries; organizational governance cadence still needed. |
| RSK-001 | PARTIAL | High | Scoring/evaluation exists; canonical risk register/treatment/acceptance lifecycle missing. |
| IAM-001 | IMPLEMENTED | Medium | Technical authorization exists; periodic identity/access review evidence not established. |
| CHG-001 | IMPLEMENTED | High | Strong CI/change controls; full repository-settings/operating-period evidence not established. |
| LOG-001 | IMPLEMENTED | High | Multiple ledger implementations; shared canonical receipt contract/integrity evidence still needs consolidation. |
| EVD-001 | IMPLEMENTED | High | Evidence graph/source registry exist; retention/access lifecycle needs policy. |
| SEC-001 | IMPLEMENTED | High | Threat/security controls are substantial; recurring vulnerability-management evidence incomplete. |
| INC-001 | PARTIAL | High | Taxonomy/escalation exists; end-to-end IR procedure/tabletop/corrective-action record missing. |
| AI-001 | PARTIAL | High | Governance/evaluation primitives exist; formal AI inventory/lifecycle/impact/monitoring records incomplete. |
| DAT-001 | MISSING | High | No canonical ecosystem data classification/retention/deletion program established. |
| SUP-001 | MISSING | High | No canonical supplier/model-provider inventory and review program established. |
| BCM-001 | MISSING | High | No evidenced backup/restore/recovery test program established. |
| REV-001 | PARTIAL | High | This assessment begins the internal-review record; recurring cadence and corrective-action closure are not yet proven. |

## Corrective-action register

P0-01 DAT-001 — create data inventory, classification, handling, retention and deletion standard; bind evidence stores and model/provider data flows.
P0-02 SUP-001 — create supplier/model-provider inventory with approved use, data exposure, dependency criticality and review cadence.
P0-03 BCM-001 — define critical records/services, backup requirements, RTO/RPO where applicable, and execute a documented restore test.
P0-04 INC-001 — establish incident procedure from detection through containment, evidence preservation, RCA, corrective action, communication and retest; execute tabletop.
P0-05 RSK-001 — establish canonical risk register and explicit treatment/accept/avoid/transfer decisions with residual risk.
P1-01 IAM-001 — document identity inventory, least-privilege model, privileged access and periodic access review.
P1-02 LOG/EVD — standardize shared decision/evidence receipt schema and retention/integrity verification.
P1-03 AI-001 — establish AI system inventory, intended use, owner, dependencies, impact/risk assessment, TEVV, monitoring and decommissioning state.
P1-04 SEC-001 — establish vulnerability/dependency scanning and remediation SLA evidence across scoped repositories.
P1-05 REV-001 — establish internal-audit/management-review cadence, finding owners, due dates, risk acceptance and closure evidence.

## Phase completion record

Phase 0 claim boundary: COMPLETE.
Phase 1 scope/truth: COMPLETE for repository-visible scope; infrastructure/organizational scope remains an external evidence dependency.
Phase 2 canonical control model: COMPLETE v0.1.
Phase 3 framework family mapping: COMPLETE v0.1; exact licensed clause/control mapping remains required before assurance.
Phase 4 gap assessment: COMPLETE v0.1.
Phase 5 remediation: STARTED; existing controls credited, corrective-action register established. Material missing controls remain open.
Phase 6 compliance-as-code: PARTIAL; CI/tests exist but canonical control-to-test evidence binding is not yet universal.
Phase 7 organizational controls: PARTIAL/MISSING; primary blocker to audit readiness.
Phase 8 evidence system: PARTIAL; strong components exist, canonical shared schema/retention not fully operationalized.
Phase 9 internal readiness audit: COMPLETE v0.1 with open findings.
Phase 10 external assurance: GATE REACHED, NOT AUTHORIZED TO CLAIM SUCCESS. Entry prerequisites are the closure or formally accepted treatment of P0 findings, exact requirement mapping, operating evidence baseline, and selection of an appropriate independent certification body/CPA firm.

## Decision

REVIEW — proceed with corrective actions. Do not represent the ecosystem as ISO certified, SOC 2 attested, or fully compliant. Current defensible position: a governed technical control environment with documented framework-alignment work and an internal readiness assessment, with material management-system gaps under remediation.