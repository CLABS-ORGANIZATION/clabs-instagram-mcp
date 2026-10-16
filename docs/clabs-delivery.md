---
type: guide
status: draft
tags:
  - needs-review
---

# CLABS delivery and review

## Iterations and authority

- Exploration: read source and authorized live data, report findings and
  uncertainty. No CR is required merely to inspect a behavior.
- Preparation: locate the owning issue, define a bounded CR, read its
  applicable accepted ADRs, and resolve architectural authority.
- Implementation: use an isolated checkout and a scoped `codex/` branch.
  Do not copy uncommitted changes from the active runtime checkout.
- Verification and review: collect command outcomes and review the exact
  proposed commit, including its known gaps.
- Integration and operation: merge, deploy, or act on Instagram only with
  the concrete authorization required for that action.

Checks alone never authorize merge. A request to prepare a PR is not
authorization to deploy or to post, reply, hide or delete comments.

## Git and CR flow

1. Read the owning issue and the complete CR. Read every applicable accepted
   ADR; if a boundary changes without a declared ADR, inspect the KB's decision
   list and record the applicable decision or authority gap first.
2. Fetch CLABS `origin/main`, record its SHA, and create a scoped branch from
   that base. For upstream imports, additionally record the selected upstream
   SHA and comparison; ordinary CLABS work does not need an upstream import.
3. Inspect status before editing. Leave unrelated changes and the active MCP
   build untouched. Never claim local runtime changes are present on main.
4. Implement the bounded change, regenerate docs when required, and run the
   [verification gate](clabs-verification.md).
5. Open a PR explicitly against CLABS `main`, referencing the issue and CR.
   Use a draft when a dependency, decision, required check or review is missing.
   Include behavior, scope, validation and material limits.
6. Record review target SHA, reviewer, findings, resolution and remaining
   risks. A self-review is labelled as such; it is not an independent review.
   A new commit requires checks and review appropriate to the new SHA.
7. Obtain explicit merge authorization for the reviewed change. Recheck main
   and head; if the effective change differs, refresh validation and review.
   Integrate through the PR, never by force-pushing main.
8. Record merge SHA, checks and any separate installation/runtime evidence.
   Close the issue only after its acceptance criteria are met. Pending live
   validation keeps the owning issue open.

## Evidence and blocked writes

Evidence identifies repository, base/head SHA, command, environment, outcome
and limits. Keep detailed task state in the issue and evidence in the PR.
Never fabricate review, integration or approval evidence.

If GitHub writes are unavailable, prepare the patch, PR description and issue
body locally. State that they were not published. Retry only when access is
available; a local artifact does not create an issue or PR.

The documentation guard checks discoverability and local links. It does not
enforce branch protection, validate external access or supply human approval.
