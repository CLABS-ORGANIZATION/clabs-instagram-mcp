---
type: change-request
status: in-progress
date: 2026-10-16
tags:
  - needs-review
---

# CR-0002 — Restore maintenance CI gates

## Target and authority

Repository: CLABS-ORGANIZATION/clabs-instagram-mcp.
Owners: [Windows #4](https://github.com/CLABS-ORGANIZATION/clabs-instagram-mcp/issues/4)
and [dependency audit #5](https://github.com/CLABS-ORGANIZATION/clabs-instagram-mcp/issues/5).
Base: CLABS main `6ec27efb48fd7aeaf423a8b490c2c63fd76871c0`.

The user authorized isolated fixes, validation and issue/PR updates on
2026-10-16. The complete issues, PR #3 and CR-0001 were read, along with the
local KB entry, handoff, architecture, account runbook and accepted ADR-0001
(hybrid Meta connectors). ADR-0001's boundaries and write controls apply;
ADR-0002 remains proposed. The decision list contains those two ADRs; this
change introduces no architectural boundary and does not adopt that proposal.
CONTRIBUTING, repository architecture, CI and maintenance delivery/verification
guidance were read before implementation.

## Problem and outcome

Windows doctor tests assume filesystem behavior that is not portable, and
main's production dependency tree fails the existing audit gate. Reproduce
Windows on the unchanged base, then make the error fixtures deterministic and
update only packages needed to restore the audit gate. PR #3 stays documentary.

## Scope

- Run unchanged main's doctor tests on Windows/Node 22 and 24 as temporary CI
  diagnosis, preserving the run as baseline evidence.
- Deterministically exercise stat failure and directory access failure without
  assuming ENAMETOOLONG or POSIX directory mode bits on Windows.
- Update production dependencies within existing manifest ranges; inspect the
  lockfile delta. No blanket dependency update, forced audit fix or upstream import.
- Preserve doctor behavior, permissions and read-only probing.

No active checkout build, runtime replacement, package identity change,
publish, deployment, credential changes or automatic merge.

## Acceptance and verification

- Baseline Windows logs identify both existing failures and the exact base.
- Replacement fixtures preserve unknown/blocked semantics on all platforms.
- Fresh npm ci, lint, format, build, full tests, coverage and production audit
  pass for the proposed dependency tree; report dev audit separately.
- Node 22/24 CI matrix and recorded review on the final SHA.
- #4/#5 remain open until authorized integration meets their criteria.

## Rollback

Revert this branch's commits before integration or use a reviewed revert PR
afterward. There is no runtime change to roll back in this delivery.
