---
type: change-request
status: in-progress
date: 2026-10-16
tags:
  - needs-review
---

# CR-0003 — Honest comment pagination and read diagnostics

## Target and authority

Owner: [Bug #2](https://github.com/CLABS-ORGANIZATION/clabs-instagram-mcp/issues/2).
Repository: CLABS-ORGANIZATION/clabs-instagram-mcp.
Base: CLABS main `6ec27efb48fd7aeaf423a8b490c2c63fd76871c0`.

Read the complete issue, PR #3 and CR-0001, the local KB marketing entry,
handoff, architecture, account runbook, security guidance and accepted
ADR-0001 (hybrid Meta connectors). Its Instagram boundary and write controls
apply; ADR-0002 remains proposed. Read CONTRIBUTING, repository architecture,
comments/media API and tools, the paginator and transport, and the maintenance
delivery/verification guides. This change does not cross a new architectural
boundary or adopt the proposed independence policy.

The user authorized read-only investigation, isolated implementation and
issue/PR evidence. No posting, replying, moderation, credential/permission
changes, runtime replacement or merge is authorized here.

## Observed problem

Live graph.instagram.com/v25.0 responses for three canary Reels contain an
actual empty `data` array. Full fields, id-only and omitted fields give the
same empty result. Transport, API and the active MCP agree on zero items.
The nullish fallback is not the cause in these samples. Two terminal pages
contain cursors but no `paging.next`; the current paginator falsely presents
them as continued/truncated reads. The third Reel has three empty pages,
with `next` on the first two and no `next` on the third.

The upstream reason for returning empty comment arrays is not yet established.
Counters do not prove comment access, and a successful empty page does not
prove missing permissions or privacy filtering. The permissions probes
return code 100, a nonexisting-field error, rather than a scope inventory.

## Scope and resulting behavior

- Comment-specific page validation rejects absent, null or non-array `data`
  instead of turning an uninterpretable payload into a successful empty list.
- For comments only, `paging.next` indicates continuation; rebuild the request
  from a usable cursor, never follow or expose that URL. A cursor on a terminal
  page is not a promise of more comments. Keep existing bounded-walk guards.
- Empty-page diagnostics state what Meta returned and the limits of that
  evidence, without claiming a filtering/deletion/permission cause.
- Add structural regressions from the observed envelopes at API and MCP/tool
  boundaries, plus repeatable sanitized live evidence and its limitations.

No change to fields, shared media/tag pagination, tool inputs/output schema,
credential management or active MCP build. Preserve MIT license/provenance.

## Verification and acceptance

- Regress terminal cursor-only pages, continued empty pages and missing data;
  distinguish a permission error from a successful empty response.
- Validate the same account/Reel through HTTP, API and MCP with an isolated
  build; record build identity, timestamp and sanitized structural evidence.
- Build, lint, formatting and appropriate/full tests; report inherited audit
  and Windows gates separately from this change.
- Do not claim restored real-comment access from synthetic tests or close #2
  while the external root cause/access evidence and integration are unresolved.
- Record review on SHA; merge and installation remain separately authorized.

## Rollback

Discard or revert the isolated branch; after authorized integration use a
reviewed revert PR. No runtime or Instagram mutation occurs in this delivery.
