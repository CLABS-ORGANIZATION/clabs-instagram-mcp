# CR-0002 verification

Owners: issues #4 and #5; delivery specification:
[CR-0002](../change-requests/cr-0002-maintenance-ci-health.md).

## Windows baseline

The diagnostic workflow checked out unchanged CLABS main
`6ec27efb48fd7aeaf423a8b490c2c63fd76871c0`, installed its own lockfile and
built it before running its doctor tests. Both Windows versions ran 56 tests:
54 passed and 2 failed, matching the PR #3 failures. This establishes inherited
fixtures rather than a documentation-PR regression.

- [Node 22 baseline](https://github.com/CLABS-ORGANIZATION/clabs-instagram-mcp/actions/runs/38936504309/job/117093251218).
- [Node 24 baseline](https://github.com/CLABS-ORGANIZATION/clabs-instagram-mcp/actions/runs/38936504309/job/117093251681).

The temporary diagnostic workflow was removed after its evidence was retained.
The final CI uses the existing unweakened OS/Node matrix and audit thresholds.
Fixtures now inject the stat/access failures through the standard fs object,
restore those methods in finally, and assert doctor created no journal or
parent directory. Real filesystem success/blocked cases and the file-mode
fixture remain. No probe behavior or permission policy changes.

## Dependency delta

Only the lockfile changes; package.json ranges and identities are unchanged.
`npm update <six named packages> --package-lock-only --ignore-scripts` selected:

| Package | Before | After |
| --- | --- | --- |
| @modelcontextprotocol/sdk | 1.30.0 | 1.32.1 |
| fast-uri | 3.1.5 | 3.1.8 |
| hono | 4.13.1 | 4.13.13 |
| ip-address | 10.4.0 | 10.7.4 |
| proxy-addr | 2.0.7 | 2.0.8 |
| qs | 6.15.3 | 6.16.1 |

The public npm audit response reports zero production advisories after this
delta, down from six affected packages on main. This is dependency inventory
evidence, not a claim about exploitability of the installed pilot.
The separate dev audit still reports one high advisory in brace-expansion;
it remains informational under the existing CI policy and tracked in #5.

## Local verification and limits

On Node 22.22.1 / npm 9.2.0, fresh npm ci from the changed lockfile, lint,
format check, build and all 1,248 tests pass; coverage is 100% for statements,
branches, functions and lines. Doctor's 56 tests also pass individually.
The test runner and loopback transport tests require execution outside the
restricted filesystem/network sandbox; a sandbox run is not cited as passing.
Production audit passes with zero advisories. Final CI and review evidence are
recorded in PR #6, bound to its proposed SHA.

No installed runtime, credentials, Instagram mutations, npm release or merge
was changed. This delivery prepares fixes; integration remains separately gated.
