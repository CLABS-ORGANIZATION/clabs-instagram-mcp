---
type: guide
status: draft
tags:
  - needs-review
---

# CLABS verification and evidence

Read [CONTRIBUTING](../CONTRIBUTING.md) and the task's CR before choosing checks.

## Commands

```sh
npm ci
npm run docs:check
npm run docs:test
npm run lint
npm run format:check
npm run build
npm run coverage
npm run audit
```

`npm run check` runs the same gate after installation, including the new
documentation guard and its negative tests. CI checks the guard separately
before the existing build/test matrix. Dependency installation and auditing
require network access; report inability to run them as a limit.

README tool and environment tables are generated. A tool/config change
requires `npm run gen:readme` and the docs-sync tests. This foundation does not
change tool contracts or generated tables.

## Evidence levels

| Evidence | What it supports |
| --- | --- |
| Unit tests with injected responses | Local request construction, normalization and policy |
| MCP transport tests | Tool schemas and transport behavior for the tested build |
| Sanitized live read | Access and response shape for the named account, capability and version |
| Approved write and read-back | The concrete authorized operation on that account |

These levels are not interchangeable. A comment counter is not proof that
the comments edge is accessible. A missing `data` key must be investigated
separately from an empty `data` array; the present paginator conflates them.

For a regression, reproduce the observed contract with sanitized synthetic
IDs and text. Preserve shape and diagnostic distinctions, not real tokens,
cursors, URLs, handles or comment bodies. Live writes remain separately gated.

Record Node/npm versions, tested commit and whether dependencies were installed
from its lockfile. Passing reused compiled tests is not a fresh full build.
