---
type: guide
status: draft
tags:
  - needs-review
---

# CLABS Working Model

This is the maintenance entry point for the CLABS Instagram connector.
It reuses the existing technical documentation rather than replacing it.
It does not claim adoption of the CLABS Project Knowledge Base Framework.

## Authority and navigation

| Concern | Canonical source |
| --- | --- |
| Agent entry | [AGENTS](../AGENTS.md) |
| Fork policy | [CLABS maintenance](../CLABS-MAINTENANCE.md) |
| Delivery, iterations, autonomy and review | [CLABS delivery](clabs-delivery.md) |
| Verification and evidence | [CLABS verification](clabs-verification.md) |
| Implementation and layer boundaries | [Architecture](architecture.md), [CONTRIBUTING](../CONTRIBUTING.md) |
| Runtime, permissions and safety | [Auth](auth.md), [Security](security.md), [Operations](operations.md) |
| Versioned delivery specifications | [Maintenance foundation CR](change-requests/cr-0001-maintenance-foundation.md) |
| Pending work | [CLABS connector issues](https://github.com/CLABS-ORGANIZATION/clabs-instagram-mcp/issues) |
| Organizational context | [CLABS Marketing Operations KB](https://github.com/cgonzalezv/jarvis-knowledge/blob/main/organizations/clabs/incubation/marketing-operations/clabs-marketing-operations.md) |
| Organization work policy | [CLABS Work Management](https://github.com/cgonzalezv/jarvis-knowledge/blob/main/organizations/clabs/governance/clabs-work-management.md) |

The KB owns shared architecture, ADRs and pilot certification. This repository
owns source, tests, executable maintenance procedures and its delivery CRs.
Issues own pending work; PRs, CI and runtime observations supply evidence.
Conversation is not a substitute for published specifications or approval.
Credentials remain in the secret store.

The inherited [roadmap](roadmap.md), [workplan](workplan.md) and
[design reviews](reviews/summary.md) describe upstream development history.
They are not the current CLABS backlog, nor proof that this fork was reviewed.
Use upstream documents for implementation detail with their dates and limits.

## Operational boundary

The pilot runs locally via MCP stdio with Infisical-provided credentials.
Development uses an isolated checkout and does not replace the active MCP
build. A reviewed commit and an installed artifact are separate identities.

As of 2026-10-16, account/media/insights work in the canary session; comment
counts can be positive while comment lists are empty. The cause is unresolved.
Keep diagnostic work in the owning Bug, with no third-party text in evidence.
The KB records completed publication evidence but still contains stale pilot
summaries; its reconciliation does not certify other capabilities.

## Diagrams

Use existing architecture diagrams where they answer the question. Add a
diagram only to explain a material boundary or flow, with source and scope
beside it. No new diagram is required for this documentation-only foundation.
