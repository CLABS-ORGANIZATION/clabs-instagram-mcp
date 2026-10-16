---
type: change-request
status: in-progress
date: 2026-10-16
tags:
  - needs-review
---

# CR-0001 — CLABS maintenance foundation

## Target and authority

Repository: CLABS-ORGANIZATION/clabs-instagram-mcp.
Owner: [issue #1](https://github.com/CLABS-ORGANIZATION/clabs-instagram-mcp/issues/1).
Base: CLABS main `6ec27efb48fd7aeaf423a8b490c2c63fd76871c0`.

Applicable accepted decision: the KB's
[ADR-0001 — hybrid Meta connectors](https://github.com/cgonzalezv/jarvis-knowledge/blob/main/organizations/clabs/incubation/marketing-operations/adr-0001-hybrid-meta-connectors.md).
Its Instagram/Ads boundaries and write controls continue.
The proposed independent-maintenance amendment is KB ADR-0002
(`organizations/clabs/incubation/marketing-operations/adr-0002-independent-instagram-maintenance.md`).
This delivery proposes policy text; it does not accept that ADR or modify the
running connector. Acceptance of the amendment is required before integrating
the new fork policy.

Preflight: read issue #1, ADR-0001, KB architecture and account runbook,
CONTRIBUTING, existing maintenance policy and CI. Upstream main was inspected
at `3088d8e3c2d1c5ccb94e63856786c8cc00a0a63b` (24 commits ahead of this base);
no upstream changes are imported.

## Problem and outcome

The fork has technical docs and tests but lacks a discoverable CLABS agent
entry and a documented main-to-PR review workflow. Provide those entry points,
reuse existing docs and keep runtime certification separate from test results.

## Scope

- Minimal AGENTS router and human-readable working model.
- Delivery, verification and independent-maintenance policy proposal.
- README and CONTRIBUTING navigation to those sources.
- Proportional local documentation guard and a negative test.
- Existing CI and `npm run check` invoke the guard.

No changes to Instagram tools, credentials, permissions, runtime, deployment,
package identity, branch protection or automatic merging. No framework
migration or catalog promotion.

## Dependencies and baseline limits

Issue #1 requires adapting the reviewed Web pilot pattern. Its parent
clabs-work #14 is readable through the authenticated CLI REST API. The pilot
is Web issue #35 / PR #36, merged as
`399e417dabc5d9b140a55475442a8cd645594503`. Its recorded review targets
`e3d645b8e6648d1722edbe8592dce63c3b5fe287`:
[review evidence](https://github.com/CLABS-ORGANIZATION/clabs-penknife-web/pull/36#pullrequestreview-5402291021).
The pilot explicitly distinguishes a recorded agent review from independent
native approval. This delivery adapts that distinction; its own review and
merge authority remain separate.

The active MCP checkout uses the separate foundation branch at
`3ec0f564cfb3a419d06a67c0dc4ed515917e28d0`, with a lockfile adjustment and
maintenance policy absent from main, plus four uncommitted publishing files.
This clean main-based delivery imports none of them. Reconciliation of those
changes requires its own reviewed delivery before replacing the running build.

## Acceptance criteria

- [x] AGENTS and README discover the CLABS working model and existing guides.
- [x] Authority, owning issues, CR/ADR preflight and scope are explicit.
- [x] Exact-SHA review, checks, merge authorization and integration evidence
  are distinguished; no fabricated historical approval.
- [x] Local guard catches broken entry links, with negative coverage.
- [x] Quality-gate results identify the exact dependency/build baseline.
- [ ] Proposed fork policy and Web-pilot dependency are resolved before merge.
- [ ] PR review and integration evidence are recorded before closing issue #1.

## Validation

Run the commands in [CLABS verification](../clabs-verification.md), then inspect
the diff and confirm no changes under `src/`, no secrets and no generated tool
table drift. The guard is not a branch protection or approval mechanism.
Live comment certification belongs to its own Bug, not this documentation CR.

## Rollback

Revert this delivery's commit on the development branch or through a reviewed
revert PR after integration. No runtime rollback, credential change or deletion
of Instagram objects is involved.

## Delivery state

Prepared on `codex/maintenance-foundation`. Publication and integration
evidence belongs to issue #1 and the PR. The GitHub connector initially
rejected writes with 403. Retrying the CLI with network access confirmed a
valid credential and repository write permissions; REST works. The earlier
invalid-credential diagnosis came from a network-restricted check and was
incorrect. The comments Bug is now [issue #2](https://github.com/CLABS-ORGANIZATION/clabs-instagram-mcp/issues/2).
No merge or runtime installation is authorized by this delivery.

Validation on Node 22.22.1 / npm 9.2.0 with a fresh install from main's
unchanged lockfile: docs guard and 5 guard tests, lint, formatting, build and
1,248 existing tests pass; coverage is 100% for statements, branches,
functions and lines. The final production audit fails with 6 reported
vulnerabilities (3 moderate, 2 high, 1 critical). Dependency remediation is a
separate proposed task; this change does not alter dependencies or claim that
the runtime is exploitable. A final guard portability adjustment was rechecked
with the guard tests and formatting.
