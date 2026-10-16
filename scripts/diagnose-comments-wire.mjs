// Bug #2: GET-only wire probe. Never print credentials, URLs, cursors, text or usernames.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const emit = (x) => process.stdout.write('IG_DIAG ' + JSON.stringify(x) + '\n');
const token = process.env.IG_ACCESS_TOKEN;
const numericId = (id) => typeof id === 'string' && /^\d+$/.test(id);
const known = ['18019730993946651', '18111615803148638', '18152155072715903'];
let calls = 0;
async function get(path, params = {}, version = 'v25.0') {
  if (typeof token !== 'string' || !token) throw new Error('credential-unavailable');
  if (calls >= 90) throw new Error('budget');
  calls += 1;
  const url = new URL('https://graph.instagram.com/' + version + path);
  for (const [k, v] of Object.entries(params))
    if (v !== undefined) url.searchParams.set(k, String(v));
  const r = await fetch(url, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token },
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
  const body = await r.json();
  const meta = {
    status: r.status,
    versionRequested: version,
    versionServed: r.headers.get('instagram-api-version') ?? r.headers.get('facebook-api-version'),
    requestId: r.headers.get('x-fb-request-id') ?? body.error?.fbtrace_id,
    errorCode: body.error?.code,
    errorSubcode: body.error?.error_subcode,
    errorType: body.error?.type,
  };
  const usage = r.headers.get('x-app-usage');
  if (usage) {
    try {
      if (Object.values(JSON.parse(usage)).some((n) => typeof n === 'number' && n >= 80))
        throw new Error('usage');
    } catch (e) {
      if (e.message === 'usage') throw e;
    }
  }
  return { body, meta };
}
async function walk(mediaId, limit, maxPages, version = 'v25.0') {
  let after;
  const seen = new Set();
  let total = 0;
  let pages = 0;
  let stop;
  for (let page = 1; page <= maxPages; page++) {
    const { body: b, meta } = await get(
      '/' + mediaId + '/comments',
      { fields: 'id', limit, after },
      version,
    );
    const more = !!b.paging?.next,
      next = b.paging?.cursors?.after;
    const repeated = typeof next === 'string' && seen.has(next);
    pages = page;
    total += Array.isArray(b.data) ? b.data.length : 0;
    stop = !Array.isArray(b.data)
      ? 'invalid-or-error'
      : !more
        ? 'terminal'
        : !next
          ? 'missing-cursor'
          : repeated
            ? 'repeated-cursor'
            : page === maxPages
              ? 'page-budget'
              : undefined;
    emit({
      stage: 'page',
      mediaId,
      limit,
      page,
      ...meta,
      dataPresent: Object.hasOwn(b, 'data'),
      dataArray: Array.isArray(b.data),
      items: Array.isArray(b.data) ? b.data.length : undefined,
      hasNext: more,
      hasAfter: typeof next === 'string',
      repeatedCursor: repeated,
      stop,
    });
    if (!Array.isArray(b.data) || !more || !next || repeated) break;
    seen.add(next);
    after = next;
  }
  emit({ stage: 'walk-summary', mediaId, limit, versionRequested: version, total, pages, stop });
}
try {
  const root = fileURLToPath(new URL('../', import.meta.url));
  emit({
    stage: 'start',
    at: new Date().toISOString(),
    requestBudget: 90,
    node: process.version,
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    dirty:
      execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()
        .length > 0,
  });
  const me = await get('/me', { fields: 'id,user_id,username,media_count' });
  const verified = me.body.username === 'fachosfera.productions';
  emit({ stage: 'identity', verified, mediaCount: me.body.media_count, ...me.meta });
  if (!verified) throw new Error('identity');
  const list = await get('/me/media', {
    fields: 'id,comments_count,media_product_type,timestamp',
    limit: 100,
  });
  if (!Array.isArray(list.body.data)) throw new Error('own-media-unavailable');
  const own = list.body.data;
  const candidates = own.filter(
    (m) =>
      numericId(m.id) &&
      typeof m.comments_count === 'number' &&
      m.comments_count > 0 &&
      !known.includes(m.id),
  );
  const extras = [...candidates.slice(0, 2), ...candidates.slice(-1)].filter(
    (m, i, a) => a.findIndex((x) => x.id === m.id) === i,
  );
  emit({
    stage: 'inventory',
    ...list.meta,
    returned: own.length,
    hasNext: !!list.body.paging?.next,
    positiveCounters: own.filter((m) => m.comments_count > 0).length,
    knownPresent: known.map((id) => ({ id, present: own.some((m) => m.id === id) })),
    extraSamples: extras.map((m) => ({ id: m.id, commentsCount: m.comments_count })),
  });
  for (const mediaId of known) {
    const r = await get('/' + mediaId, {
      fields: 'id,comments_count,owner,media_product_type,is_comment_enabled,timestamp',
    });
    emit({
      stage: 'media',
      mediaId,
      ...r.meta,
      commentsCount: r.body.comments_count,
      product: r.body.media_product_type,
      commentsEnabled: r.body.is_comment_enabled,
      ownerPresent: !!r.body.owner,
      ownerMatchesConfigured: !!r.body.owner?.id && r.body.owner.id === me.body.user_id,
      ownerMatchesScoped: !!r.body.owner?.id && r.body.owner.id === me.body.id,
      listedByOwnMedia: own.some((m) => m.id === mediaId),
    });
    await walk(mediaId, 50, 8);
    await walk(mediaId, 25, 16);
    await walk(mediaId, 50, 8, 'v24.0');
  }
  for (const m of extras) await walk(m.id, 50, 8);
  emit({ stage: 'done', calls });
} catch (e) {
  emit({
    stage: 'failure',
    name: e.name,
    reason: [
      'budget',
      'usage',
      'identity',
      'credential-unavailable',
      'own-media-unavailable',
    ].includes(e.message)
      ? e.message
      : 'request-failed',
    calls,
  });
  process.exitCode = 1;
}
