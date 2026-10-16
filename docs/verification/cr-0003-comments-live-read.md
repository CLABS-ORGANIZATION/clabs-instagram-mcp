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

The original probe requests graph.instagram.com/v25.0 and receives HTTP 200.
It did not capture the response version header; the follow-up below distinguishes
the requested URL version from the version reported by Meta.

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
now uses limit 50 and bounds each cursor walk at twelve pages. The original
17:10 probe used limit 100 and five pages. No credentials or cursors are supplied
as arguments. It performs GET requests only and refuses a different account.

Bug #2 stays open: the local diagnostic/pagination correction is prepared,
while external root cause, real-comment access, review, authorized integration
and installed-runtime verification remain distinct requirements.


## Follow-up: access, ownership and exhaustive wire walks

At **2026-10-16 20:00 UTC**, a new Infisical-launched process used the current
secret directly in an Authorization header. No credential was exchanged,
refreshed or written. The operator had previously reported replacing the token;
no scope inventory or independent token-version metadata has been obtained.

The complete `/me/media` response contains 15 media, no next page, and 11
positive comment counters. The three original IDs are present. Each original
media returns `owner.id == /me.id`, `is_comment_enabled == true`, and
`media_product_type == REELS`. The configured user_id and scoped `/me.id`
differ, as already observed; ownership matches the scoped ID. These checks
rule out a wrong owner or disabled-comment flag for these three samples.

The wire-only matrix makes **41 GET requests**, with `fields=id` for comments.
Every comment response is HTTP 200 with an actual empty array, including all
continuations until Meta omits next. No walk reaches its page or request budget.

| Own media ID | Counter | Pages, limit 50 | Pages, limit 25 | Items across either walk |
| --- | --- | --- | --- | --- |
| 18019730993946651 | 71 | 2 | 3 | 0 |
| 18111615803148638 | 19 | 1 | 1 | 0 |
| 18152155072715903 | 252 | 6 | 11 | 0 |

Three additional own-media samples also terminate with zero items at limit 50:
`17913381747285830` (counter 9, published that day), `18097615922670706`
(counter 15), and `18465445687185285` (counter 2). Each has one terminal page.
This broadens the observation to six Reels, including recent and older media;
it does not certify the other nine media or identify the provider's filtering
rule. The relationship between page counts and counters is consistent with a
server-side visibility restriction, but does not prove its exact cause.

### URL version is not a verified version comparison

All matrix responses declare **`instagram-api-version: v26.0`**, including
requests whose URLs explicitly specify v24.0 or v25.0. The v24.0/limit-50 walks
also terminate in 2/1/6 empty pages. A separate first-page check with explicit
v26.0 and an unversioned URL gives the same version header and empty result.
`facebook-api-version` is absent. These are observations of response headers;
they do not establish why Meta reports v26.0 or prove a v25-only regression.
Changing the connector's version constant is not an evidenced fix.

### Permission checks and the dashboard

The operator's screenshot shows `instagram_business_manage_comments` as
ready for testing, with six calls and an option to add it to App Review.
This proves app configuration, not the token's granted scopes. The screenshot
also shows basic, publishing and insights ready for testing. An earlier roles
screen lists the canary as an Instagram tester; it does not explicitly show
invitation acceptance. Earlier screenshots show the app unpublished; no current
published-mode change has been performed as part of this investigation.

Additional GET probes using the current Instagram token:

- `/debug_token`: HTTP 403, IGApiException code 10. No scope inventory returned.
- `/debug_access_token`: HTTP 400, code 100/subcode 33. No inventory returned.
- `/{configured-user-id}/tags`: HTTP 200, empty data. This is not proof of a
  granted comment scope.

These failures concern introspection attempts. They do not establish a missing
comments permission. The official Graph debug-token reference requires an app
access token or a developer's user token; the current Instagram token alone
has not supplied an authorized introspection path. No such additional credential
was requested, changed or created by the probe.

### Diagnosis and remaining discriminating evidence

Established: Meta supplies the empty arrays before the MCP; the nullish fallback
is not discarding comments in these samples. Smaller supported page sizes and
exhaustive continuation do not recover them. Ownership and comments-enabled
state are correct on the three originals. The fresh process result makes an
old active-process token an insufficient explanation. The separate terminal
cursor/diagnostic defect is fixed in this PR, but cannot restore these comments.

The leading area of investigation is effective authorization/visibility at Meta.
The precise grant, an app-role restriction and a provider defect remain distinct
hypotheses. Lack of Advanced Access, deletion, privacy or ad-only comments have
not been established. The user's confirmation that comments exist does not
identify their authors or whether they are organic versus advertising comments.

The next useful evidence is a read-only inventory of scopes for this exact
credential and confirmation of the accepted canary role, followed by reading a
known existing own-account comment by its API ID if available. If permissions
and role are confirmed, the wire requests below form a reproducible provider
case. Do not add further scopes, publish the app, reauthorize repeatedly or switch
to Facebook Login as an inferred remedy. A controlled new comment would be a
write and requires its own authorization; none was posted.

### Provider reproduction packet, prepared only

- Account: authorized professional canary @fachosfera.productions.
- Time: 2026-10-16T20:00:11.861Z onward, graph.instagram.com.
- Request: GET `/{media-id}/comments`, fields id, limit 25 or 50; reconstruct
  continuations with the cursor, without following or disclosing the next URL.
- Expected: accessible top-level comment objects, or an explicit access error.
- Actual: HTTP 200, data array empty on all pages despite positive counters;
  ownership and comments-enabled checks succeed.
- Example provider request IDs for limit-50 first pages: Carapó
  `A2o-UnneJn7adq2BdMxHMun`; Don Feijote `At4RH3_19clhby3hPkGk4j0`;
  homenaje `Ac-nz9xhLNjsCVo-V8nrgSP`.
- Response version header: v26.0 for requested v24.0/v25.0.
- Scope and role inventory is still missing; this packet does not certify it.

No report has been sent to Meta. Owning issue #2 remains open.

### Reproduce the broader GET-only probe

With the same authorized secret-store injection, run:

```sh
node scripts/diagnose-comments-wire.mjs
```

The script validates the canary handle, reads at most one own-media inventory
page, tests the three original media and at most three other own media with
positive counters. It limits each walk to 8 pages at size 50 or 16 at size 25,
with a global 90-request ceiling and an early stop on reported app usage >=80%.
Terminal, repeated-cursor, malformed and budget stops are distinguished in the
output. It prints only structural summaries, own IDs/counters, version headers,
request IDs and source identity. Token, URLs, cursors and third-party content
never enter the output. The existing HTTP/API/stdio diagnostic now also prints
response version headers, uses limit 50 and has a 12-step continuation ceiling.

### Primary documentation consulted

- [Comment moderation](https://developers.facebook.com/documentation/instagram-platform/comment-moderation):
  Instagram Login requires basic and manage_comments; Standard Access covers
  own/managed professional accounts added to the app.
- [App Review](https://developers.facebook.com/documentation/instagram-platform/app-review):
  review is not required for the own/managed-business Standard Access scenario.
- [Overview](https://developers.facebook.com/documentation/instagram-platform/overview):
  Standard has general data/functionality limits, without proving this case's cause.
- [Comments reference](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-media/comments):
  maximum 50 per query; advertising comments are a separate API surface.
- [Debug token](https://developers.facebook.com/docs/graph-api/reference/debug_token/):
  introspection authentication requirements and scope metadata.
- [Support](https://developers.facebook.com/documentation/instagram-platform/support):
  provider bug-reporting, status and developer tools.


### Committed-probe confirmation and local validation

At **2026-10-16 20:05 UTC**, both versioned probes ran from clean source commit
`bdc61942787f13becd5eb225e97cf454f2c5bbe7`, Node 22.22.1, after a fresh isolated
TypeScript build. The broader wire matrix again made 41 GETs and reproduced
all 2/1/6 page counts at size 50 and 3/1/11 at size 25, with zero items and
terminal stops. The recent extra sample's counter had increased from 9 to 12;
its comments edge remained empty. Source identity and clean-tree state were
emitted by each probe, with the existing Infisical configuration used for each
new process.

The HTTP/API/MCP stdio probe also agreed at every continuation: 2/1/6 pages,
zero items, correct terminal states, and `instagram-api-version: v26.0` on HTTP
responses. Full fields, id-only and omitted fields remained empty. No active
MCP process was replaced. This follow-up evidence commit changes docs only.

Local syntax checks, repository lint, formatting and build pass. The existing
comment API, tool and MCP regression modules pass when run directly (29, 40
and 1 tests respectively; 70 total), including malformed-data, denied and
terminal/continued-page cases. No new synthetic tests were added for these
GET-only diagnostic scripts; their real executions are recorded above. The
previous full 1,256-test/100%-coverage result applies to unchanged production
source and tests, not a new full-suite run in this follow-up. CI audit and
Windows remain the separately tracked inherited limits until PR #6 is integrated.
