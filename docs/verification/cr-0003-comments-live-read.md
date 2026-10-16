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


## Implementation audit against the official Instagram Login contract

The operator supplied two additional UI observations: the official debugger
shows the inspected token valid, for CLABS Media Pilot-IG and the same scoped
user ID, with all five agreed scopes including manage_comments; Instagram lists
the app under Active, authorized on 2026-10-16. Only these facts are transcribed.
The debugger screenshot includes a credential field and is never attached or
copied into this repository. Active authorization is not independently labelled
as acceptance of the tester invitation, and does not prove comment readability.

The requested review traced tool input -> API -> auth -> URL -> actual HTTP ->
JSON parsing -> comment/reply normalization -> MCP structured output. The
current official guide and references were fetched directly from Meta's `.md`
endpoints; no upstream code or third-party workaround was imported.

| Concern | Official contract | Implementation finding |
| --- | --- | --- |
| Host and method | Instagram Login: GET on graph.instagram.com | Correct; no graph.facebook.com call or write on the comments reader |
| Node identifier | IG Media ID from own /media | Passed unchanged as a string from mediaId into the path; verified ownership for originals |
| User identifier | /me.id is app-scoped; user_id is professional account ID | Distinction agrees with the official get-started reference; user/account ID is not substituted for media ID |
| Authentication | Instagram User token; access_token query shown in reference | Auth contributes the token, without appsecret_proof; raw query and Bearer controls agree |
| Fields | id, text, username, timestamp, like_count; replies expansion supported | Requested fields are documented; username is supported with manage_comments, so no speculative from-only rewrite |
| Page size | Maximum 50 returned per query | Existing tool accepts 1–100 and forwarded the hint unchanged. Cap the wire hint at 50, keeping input compatibility |
| Cursor | Opaque cursor and actual next marker | URLSearchParams preserves cursor value; never cast IDs/cursors to numbers or follow a next URL |
| Returned data | Collection in data; nested replies.data | Parser returns raw JSON; normalization maps every present top-level item and flattens reply data, preserving optional omissions |
| MCP mapping | Caller account/fetchAll/maxItems are local controls | Only fields, limit, after and access_token enter the comments query; no local controls leak to Graph |

### Independent minimum-request control

At **2026-10-16 20:19 UTC** (22:19 Europe/Madrid), an independent launcher
verified the canary via /me, then ran four GET variants per original media:

1. Bare comments endpoint plus Authorization Bearer, no fields/limit/after.
2. Bare endpoint plus access_token query, no other parameters.
3. Explicit fields id,text,timestamp, no limit/after.
4. System curl with only access_token in the query, no fields/limit/after.

All **12 comment requests** return HTTP 200 with a genuine empty data array.
Only the first page is inspected in this minimal control; next is present for
Carapó/homenaje and absent for Don Feijote. The earlier exhaustive 25/50 walks
remain separate evidence. Node responses report instagram-api-version v26.0.
The curl process receives its configuration via stdin: no token in arguments,
files or printed output; provider bodies stay in memory and only response
shape/status/counts leave the launcher. No connector module constructs or maps
these curl requests. Thus production fields, explicit page size, cursor mapping
and response normalization are not necessary to reproduce the initial empty
page. This does not prove the exact provider-side restriction.

### Bounded correction and meaningful regression

A new MCP protocol regression was first run before the page-size correction:
it failed with actual HTTP limit **100**, expected **50**. After the correction,
the same test also checks an ID larger than Number.MAX_SAFE_INTEGER stays an
exact string, a cursor containing + / = survives URL encoding, the token stays
intact, only documented query keys reach HTTP, and positive synthetic comments,
usernames, timestamps, counts and nested replies reach MCP output. The two
pages terminate correctly without following the untrusted next URL.

The diagnostic HTTP/API/stdio probe now requests input limit 100 through API
and MCP, while capturing safe request metadata for the local API's actual
HTTP request. Its raw control still uses limit 50. Token equality is emitted
as a boolean only; token/cursor values and full URLs are never printed.
This fixes a documented page-size mismatch; the minimum curl control already
shows that it cannot be claimed as a fix for the initial empty-array problem.

### Other documented limits, not established causes

The IG Comment reference explicitly says comments on age-gated media are not
returned, and comments by restricted users require the documented unrestricted/
approved conditions. These are concrete visibility rules to investigate, not
findings about this account. The references also separate ad comments from the
organic comments edge. No age setting, user restriction, ads setup or app role
was changed, and none is declared the cause. No extra permission, Facebook
Login migration, app publication or new comment is justified by this audit.

Relevant primary references: [Comment moderation](https://developers.facebook.com/documentation/instagram-platform/comment-moderation),
[Comments](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-media/comments),
[IG Comment fields and limits](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-comment),
[Instagram Login get-started IDs](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started).


### Validation of the bounded implementation change

The same new protocol test fails before the correction with HTTP limit 100
rather than 50, and passes afterward. Local comment API/tools/protocol modules
pass 29/40/2 tests. README generation, lint, formatting, build and syntax checks
pass; README's generated tables have no drift.

A full sandboxed coverage attempt failed in existing subprocess/transport test
files and reported incomplete global coverage. Repeating the same built suite
with the required local filesystem/loopback execution access passes **1,257
tests, zero failures, and 100% statements/branches/functions/lines**. No tests
were weakened or changed to bypass those environmental restrictions. Existing
production audit and Windows fixture issues remain separately tracked in #5/#4
and prepared in PR #6; this change does not import their fixes.


### Diagnostic-walk correction discovered during the live recheck

The first post-fix run at 20:26 UTC used clean code
`baac73ba3cccd06e93b296a3855e741813d5a898`. All captured local comment requests
sent limit 50 for API input 100, with the expected token, query keys and no
appsecret_proof. All returned data arrays were empty. On the homenaje, the
fourth interleaved API/MCP comparison had different continuation flags. The
old diagnostic then stopped both walks when either layer ended: that left the
API's advertised continuation uninspected. This is a defect in the diagnostic
harness, separate from production comment processing. That run cannot be
presented as an exhaustive matching walk. Its exact cause for the differing
live flags was not established.

The diagnostic now walks API and stdio independently, each with its own cursor
and 12-step ceiling. It captures the stdio server's own HTTP request/response
shape over an explicitly sanitized stderr channel, preserving stdout MCP
protocol purity. Arbitrary stderr and untrusted text are discarded; accepted
records are reconstructed from fixed labels, known numeric media paths,
whitelisted query keys, booleans/counts and bounded version formats. Tokens,
URLs, original cursors, field values from users and provider messages are
never forwarded.

A development run of that harness at 20:29 UTC (tree explicitly marked dirty)
shows each independent API/MCP walk terminal after 2/1/6 steps. The nine stdio
HTTP responses contain empty arrays and their next flags match the nine MCP
continuation results. Both processes send limit 50; child request fields match
the documented field set, IDs stay in the expected paths and token matching
is confirmed only as a boolean. This supports correct mapping in that run;
it does not retroactively explain the earlier live difference or prove a
provider-side cause. A clean-source repeat is recorded separately.


### Clean-source transport confirmation after the audit

At **2026-10-16 20:30:47 UTC** (22:30 Europe/Madrid), source
`fc45a4ad4553b9a0ef61ae4a2cd510ffd98205c5`, clean tree, Node 22.22.1,
Instagram Login and a fresh existing Infisical injection were verified.
The API and actual stdio client both submit input limit 100. All observed
comments HTTP requests send 50. The stdio server's own nine requests confirm
expected numeric media paths, the documented fields, token matching as a
boolean, no unexpected query keys and no appsecret_proof.

| Media ID | API steps | MCP steps | HTTP/MCP items | Both terminal |
| --- | --- | --- | --- | --- |
| 18019730993946651 | 2 | 2 | 0 | yes |
| 18111615803148638 | 1 | 1 | 0 | yes |
| 18152155072715903 | 6 | 6 | 0 | yes |

All nine child HTTP responses are 200 with data arrays empty. Their next flags
match the MCP after flags one-to-one. No MCP errors or uninspected continuation
remain in this run. The response header remains v26.0. Production source/tests
are unchanged since the 1,257-test/100%-coverage build; this follow-up commit
only records the clean run. Active checkout remains at 3ec0f564cfb3a419d06a67c0dc4ed515917e28d0
with its same four publishing modifications; no runtime replacement occurred.

Audit conclusion: the wire page-size mismatch and diagnostic coupled-walk stop
are corrected, in addition to the earlier terminal/malformed-page safeguards.
The host, node ID, field names, token parameter, cursor encoding and positive
comment/reply mapping agree with the primary contract in the tested path.
The independently minimal curl control still reproduces an empty initial page
without those optional parameters or any connector code. The exact visibility
restriction or provider-side cause remains open. The new documented age-gating
and restricted-user limits are hypotheses to verify, not established diagnoses.


## Test environments and matching incident reports

User-requested broader research on 2026-10-16 changes the investigation priority.
Endpoint documentation had been reviewed; the prior incident search was
incomplete. No additional Instagram request or state change is needed to record
these findings.

### What Meta documents as a test environment

- [Test Apps](https://developers.facebook.com/documentation/development/build-and-test/test-apps):
  child apps clone parent settings at creation, isolate app configuration, and
  are always Development-mode apps. A clone therefore does not prove that a
  Development/publication visibility restriction has been bypassed.
- [Test Users](https://developers.facebook.com/documentation/development/build-and-test/test-users):
  simulated Facebook accounts for testing Facebook Login, distinct from real
  testers. The current page also states new test-user creation is temporarily
  disabled. This is not an Instagram Login comment sandbox.
- Meta's [Instagram Login Postman collection](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login)
  provides requests against the actual API. It is a reference client, not an
  independently populated simulated Instagram server.
- No reviewed official source provides a synthetic Instagram comment environment
  that reproduces live authorization. Our offline HTTP/MCP fixtures test local
  implementation; only an authorized real API control can certify access.

### Firsthand reports, distinguished from provider guarantees

1. [Openreply issue #64](https://github.com/diwenne/openreply/issues/64),
   opened 2026-09-16, reports positive counts and empty raw comments even with
   an accepted Instagram tester. In the [author's follow-up](https://github.com/diwenne/openreply/issues/64#issuecomment-5703149608),
   publishing the app reportedly restored reading on the next call without
   another change. The issue remains open in GitHub despite that resolution report.
2. A [Stack Overflow answer](https://stackoverflow.com/questions/78792152/the-instagram-api-is-returning-no-comments-data-for-the-specified-post/78806543)
   describes the same Instagram Login symptom and reports recovery after moving
   the app to Live. This is another account's reported outcome, not a Meta guarantee.

These primary firsthand accounts support prioritizing publication state; they
are not a reproduction on CLABS. Forked/copied setup guides were not counted as
independent corroboration. No workaround code was imported.

### Publication, app modes and access levels are separate

[Meta's publishing guide](https://developers.facebook.com/documentation/development/release)
separates Use Case Apps (dashboard Publish / Go live) from the app-mode toggle
for applicable app types, and states Business apps rely on access levels.
Do not assume the older Development/Live toggle exists in this dashboard.
The [App Modes guide](https://developers.facebook.com/documentation/development/build-and-test/app-modes)
describes role-user limits but does not specifically guarantee comments GET
visibility for this account. The Instagram-specific App Review table still
says own/managed-business Standard Access does not require review; that is
not proof that an unpublished app can read these comments. Publication is
not interchangeable with obtaining Advanced Access or App Review approval.

CLABS screenshots show a Use Case dashboard with Publish / Unpublished.
Current grant and active-app evidence are already recorded. Unpublished
status is now the **leading hypothesis to test**, rather than another reason
to add scopes or rotate tokens. It is not yet the verified cause of Bug #2.

### Proposed controlled validation, not executed or authorized to publish

First inspect CLABS Media Pilot's Publish section read-only and enumerate its
actual blockers and prerequisites. Do not click the final publication action,
create legal URLs with invented facts, change scopes or request Advanced Access
as a shortcut. A concrete publication operation needs its own authorization;
the present CR authorizes reads and isolated code/evidence only.

If publication is subsequently approved and prerequisites are satisfied:

1. Preserve the already verified app/account, current token, media IDs, code SHA,
   fields, page size and MCP write controls. Capture a fresh GET-only baseline.
2. Change only the explicitly approved publication state and record the UI result.
3. Repeat the same bounded raw/API/stdio reads, recording version headers,
   statuses, counts and terminal flags, without comment contents or credentials.
4. If comments become readable, record the before/after evidence against this
   hypothesis. If not, retain the result and prepared provider packet; do not
   change additional settings without new evidence and authority.

An isolated normal app with a controlled professional account is an alternative
for experiments, but still uses the real Instagram API. A child Test App is
useful for configuration isolation, and its permanent Development mode may
retain the exact condition under investigation. No test app/account/comment,
webhook, publication, permission, token or active MCP was created or changed.
