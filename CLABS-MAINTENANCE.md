---
type: guide
status: draft
tags:
  - needs-review
---

# CLABS maintenance

## Ownership and policy proposal

CLABS owns delivery and acceptance of this connector. The historical baseline
is a fork of IvanBBaev/instagram-mcp. Its license and copyright notices remain.

The maintenance proposal requested on 2026-10-16 is independent CLABS
development: CLABS requirements can justify features and refactors, with
proportionate tests and review. Compatibility and minimal divergence from
upstream are not acceptance criteria for every CLABS change.

This amends only the minimal-divergence clause of the KB's accepted ADR-0001.
The amendment is proposed in ADR-0002 and requires acceptance before this
proposal is treated as effective policy. Instagram remains separate from
Meta Ads and Facebook Pages; no multi-tenant control plane is implied.

## Upstream relationship

- `origin`: `CLABS-ORGANIZATION/clabs-instagram-mcp`.
- `upstream`: `IvanBBaev/instagram-mcp`, retained for provenance and optional
  imports, not automatic synchronization.
- For an upstream import, fetch and compare the selected commit, identify
  security and compatibility implications, and deliver it through a reviewed
  CR and PR. Ordinary CLABS work need not wait for an upstream release.
- Never publish under upstream's package identities or credentials as a side
  effect of a CLABS change. Existing manifests retain upstream distribution
  metadata; defining CLABS package identities is a separate delivery.

## Maintenance workflow

Use [delivery and review](docs/clabs-delivery.md) and
[verification](docs/clabs-verification.md). Keep changes scoped, preserve
unrelated local work, and keep secrets and runtime profiles outside Git.
Passing a documentation guard does not establish human approval, branch
protection, API compatibility or production readiness.

## Sources

- [Working model](docs/clabs-working-model.md).
- [KB architecture and accepted ADR-0001](https://github.com/cgonzalezv/jarvis-knowledge/blob/main/organizations/clabs/incubation/marketing-operations/adr-0001-hybrid-meta-connectors.md).
- Proposed ADR-0002: KB path
  `organizations/clabs/incubation/marketing-operations/adr-0002-independent-instagram-maintenance.md`;
  not yet published when this delivery was prepared.
