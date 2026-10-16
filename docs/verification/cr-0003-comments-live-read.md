# CR-0003 — Live comment-read evidence and limits

Owner: [Bug #2](https://github.com/CLABS-ORGANIZATION/clabs-instagram-mcp/issues/2).
Specification: [CR-0003](../change-requests/cr-0003-comments-read-diagnostics.md).

## Identity and method

Read-only probe at **2026-10-16 17:10 UTC**, Node 22.22.1 / npm 9.2.0,
code commit `5cdded7e2e45461b1f2620d706683194e3bfefb0`, clean source tree.
Built from CLABS main `6ec27efb48fd7aeaf423a8b490c2c63fd76871c0` with its
unchanged lockfile. The following evidence-document commit changes no code.
The profile's configured user_id matches the `/me` response and the handle is
the authorized canary @fachosfera.productions. `/me.id` is a different scoped
identifier; that difference alone is not evidence of the wrong account.

The probe uses the existing secret-store environment in an isolated checkout.
It compares real HTTP response shape, the API function, and a separate MCP
stdio server/client using the same built API/tools/registry. The stdio process
registers readers only and has no token-refresh or credential-write wiring.
It does not launch, rebuild or replace the active MCP checkout.

Only response keys, counts, cursor/next presence, statuses and connector-owned
notes are emitted. No response bodies, original cursors, next URLs, tokens,
signed URLs or third-party names/text are retained.

## Observations

All comment requests use graph.instagram.com/v25.0 and return HTTP 200.

| Canary media ID | Counter | Wire pages (full fields, limit 100) | API and isolated MCP stdio |
| --- | --- | --- | --- |
| 18019730993946651 | 71 | One empty array; cursors present, no next | 0 items, no continuation, truncated false |
| 18111615803148638 | 19 | One empty array; cursors present, no next | 0 items, no continuation, truncated false |
| 18152155072715903 | 252 | Three empty arrays; next on pages 1/2, absent on 3 | 0 items on all three; continuation on 1/2, terminal on 3 |

For every media, `fields=id` and omitted fields also return empty arrays.
The full field set remains
`id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}`.
Explicit continuation of the terminal cursors in the old code returns another
empty array without more paging. That is not access to comments.

The unchanged API and active MCP expose terminal cursors as continuation and
attach a filtered/deleted explanation. The proposed code ends terminal pages
correctly and uses a neutral note: Meta returned an empty page, and counts do
not prove API access. On genuinely continued empty pages it retains the
bounded stop and resumable cursor, without asserting a provider-side cause.
HTTP/API/stdio summaries agree on every proposed-code page above.

## Cause established and cause still unknown

**Established:** the observed zero items originate in Meta's actual `data: []`
response, before normalization. `page.data ?? []` is not hiding returned
comments in these samples. A separate local defect mistakes terminal cursor
boundaries for continuation and overstates a filtering/deletion explanation.
Missing/non-array `data` is now an explicit upstream error, rather than another
successful empty result. Explicit permission errors stay errors.

**Unknown:** why Meta exposes no comments for these credentials. GET
`/me/permissions`, `/{configured-user-id}/permissions` and
`/{scoped-id}/permissions` all return HTTP 400 / IGApiException code 100,
with a nonexisting `permissions` field error. They do not provide a scope
inventory and do not prove a missing comment permission. Path-A token status
also does not expose granted scopes; no app credentials were configured for
an authorized introspection path.

The KB describes a Development pilot, but it does not verify the current app
mode, app access level or granted scope. Confirm those states read-only in
Meta's dashboard, specifically `instagram_business_manage_comments` and the
canary app role. Provider documentation was inaccessible through the browsing
tool during this investigation. Development-mode filtering, missing scopes,
privacy/deletion and a provider defect remain hypotheses, not findings.
Do not change permissions or rotate a credential as an inferred remedy.

## Verification and repeatability

Fresh npm ci from main's lockfile, lint, formatting, build and **1,256 tests**
pass locally, including HTTP/API/MCP structural regressions. Coverage remains
100% for statements, branches, functions and lines. These synthetic tests do
not certify real-comment access. Production audit and Windows fixture failures
are inherited from main; their separate correction is PR #6 / CR-0002.
No tests or source from the operational publishing changes were imported.

With the existing credentials already injected through the authorized secret
store, build the isolated checkout and run:

```sh
node scripts/diagnose-comments.mjs \
  18019730993946651 18111615803148638 18152155072715903
```

The script requires the canary handle, permits at most three numeric IDs and
bounds each cursor walk at five pages. No credentials or cursors are supplied
as arguments. It performs GET requests only and refuses a different account.

Bug #2 stays open: the local diagnostic/pagination correction is prepared,
while external root cause, real-comment access, review, authorized integration
and installed-runtime verification remain distinct requirements.
