// CR-0003 / Bug #2. Read-only diagnostic. Supply credentials via the existing
// secret-store environment; never as arguments. stdout contains summaries only.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadProfiles, resolveProfile } from '../dist/src/core/config.js';
import { loadSettings } from '../dist/src/core/settings.js';
import { createAuthProvider } from '../dist/src/core/auth.js';
import { createIgRequest } from '../dist/src/core/http.js';
import { systemClock } from '../dist/src/core/clock.js';
import { registerSecret } from '../dist/src/core/redact.js';
import { listComments } from '../dist/src/api/comments.js';
import { registerTools } from '../dist/src/mcp/registry.js';
import { commentsTools } from '../dist/src/tools/comments.js';

const settings = loadSettings({
  ...process.env,
  IG_WRITE_MODE: 'preview',
  IG_ALLOW_DESTRUCTIVE: 'false',
});
const profile = resolveProfile(loadProfiles().profiles, 'default');
registerSecret(profile.accessToken);
const log = { debug() {}, info() {}, warn() {}, error() {}, child: () => log };
const serverMode = process.argv[2] === '--server';
const emit = (record) => process.stdout.write(`IG_DIAG ${JSON.stringify(record)}\n`);
const shape = (body) => ({
  keys: Object.keys(body ?? {}),
  dataPresent: Object.hasOwn(body ?? {}, 'data'),
  dataArray: Array.isArray(body?.data),
  items: Array.isArray(body?.data) ? body.data.length : undefined,
  hasAfter: typeof body?.paging?.cursors?.after === 'string',
  hasNext: Boolean(body?.paging?.next),
});
const request = createIgRequest({
  auth: createAuthProvider(profile),
  settings,
  clock: systemClock,
  log,
  fetchImpl: async (...args) => {
    const outgoing = new URL(args[0]);
    if (!serverMode && outgoing.pathname.endsWith('/comments'))
      emit({
        stage: 'request-contract',
        method: args[1]?.method,
        host: outgoing.hostname,
        path: outgoing.pathname,
        queryKeys: [...outgoing.searchParams.keys()].sort(),
        limitSent: outgoing.searchParams.get('limit'),
        fieldsSent: outgoing.searchParams.get('fields'),
        hasAfter: outgoing.searchParams.has('after'),
        tokenMatchesProfile: outgoing.searchParams.get('access_token') === profile.accessToken,
        hasAppsecretProof: outgoing.searchParams.has('appsecret_proof'),
      });
    const response = await fetch(...args);
    if (!serverMode)
      emit({
        stage: 'http',
        status: response.status,
        instagramVersion: response.headers.get('instagram-api-version'),
        facebookVersion: response.headers.get('facebook-api-version'),
        ...shape(await response.clone().json()),
      });
    return response;
  },
});

// This separate stdio process registers read tools only and has no token
// refresh/write-credentials composition. It never replaces the active MCP.
if (serverMode) {
  const server = new McpServer({ name: 'clabs-comments-read-diagnostic', version: '0.0.0' });
  registerTools({
    server,
    tools: commentsTools,
    profiles: [profile],
    defaultProfileName: 'default',
    settings,
    clock: systemClock,
    log,
    makeRequest: () => request,
    env: { IG_TOOL_PACKAGES: 'reader' },
  });
  await server.connect(new StdioServerTransport());
} else {
  const ids = process.argv.slice(2);
  if (ids.length === 0 || ids.length > 3 || ids.some((id) => !/^\d+$/.test(id))) {
    throw new Error('Supply 1–3 numeric media IDs; no credentials or cursors.');
  }
  const root = fileURLToPath(new URL('../', import.meta.url));
  emit({
    stage: 'identity',
    at: new Date().toISOString(),
    node: process.version,
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    dirty:
      execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()
        .length > 0,
    authPath: profile.authPath,
  });
  const account = await request({
    method: 'GET',
    path: '/me',
    params: { fields: 'id,user_id,username' },
  });
  emit({
    stage: 'account',
    isCanary: account.username === 'fachosfera.productions',
    configuredUserIdMatches: account.user_id === profile.accountId,
  });
  if (account.username !== 'fachosfera.productions')
    throw new Error('Unexpected canary account; stopping.');
  const fields =
    'id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}';
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(import.meta.url), '--server'],
    env: Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined)),
    stderr: 'pipe',
  });
  // Never forward child stderr: unexpected errors may include provider data.
  transport.stderr?.on('data', () => {});
  const client = new Client({ name: 'clabs-comments-read-client', version: '0.0.0' });
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    if (tools.tools.some((tool) => tool.annotations?.readOnlyHint !== true))
      throw new Error('Diagnostic exposed a write tool.');
    for (const mediaId of ids) {
      const media = await request({
        method: 'GET',
        path: `/${mediaId}`,
        params: { fields: 'id,comments_count' },
      });
      emit({ stage: 'counter', mediaId, commentsCount: media.comments_count });
      for (const variant of ['full', 'id-only', 'omitted']) {
        const page = await request({
          method: 'GET',
          path: `/${mediaId}/comments`,
          params: {
            limit: 50,
            fields: variant === 'full' ? fields : variant === 'id-only' ? 'id' : undefined,
          },
        });
        emit({ stage: 'wire', mediaId, variant, page: 1, ...shape(page) });
        if (variant === 'full') {
          let current = page;
          for (let n = 2; current.paging?.next && current.paging?.cursors?.after && n <= 12; n++) {
            current = await request({
              method: 'GET',
              path: `/${mediaId}/comments`,
              params: { limit: 50, fields, after: current.paging.cursors.after },
            });
            emit({ stage: 'wire', mediaId, variant, page: n, ...shape(current) });
          }
        }
      }
      let apiAfter;
      let mcpAfter;
      for (let n = 1; n <= 12; n++) {
        const api = await listComments(request, {
          mediaId,
          limit: 100,
          maxItems: 200,
          fetchAll: true,
          after: apiAfter,
        });
        emit({
          stage: 'api',
          requestedLimit: 100,
          mediaId,
          page: n,
          items: api.items.length,
          hasAfter: !!api.after,
          truncated: api.truncated,
          note: api.note,
        });
        const result = await client.callTool({
          name: 'instagram_list_comments',
          arguments: {
            account: 'default',
            mediaId,
            limit: 100,
            fetchAll: true,
            ...(mcpAfter ? { after: mcpAfter } : {}),
          },
        });
        const mcp = result.structuredContent;
        emit({
          stage: 'mcp-stdio',
          requestedLimit: 100,
          mediaId,
          page: n,
          isError: !!result.isError,
          items: mcp?.items?.length,
          hasAfter: !!mcp?.paging?.after,
          truncated: mcp?.paging?.truncated,
          note: mcp?.note,
          sameSummary:
            api.items.length === mcp?.items?.length && api.truncated === mcp?.paging?.truncated,
        });
        apiAfter = api.after;
        mcpAfter = mcp?.paging?.after;
        if (!apiAfter || !mcpAfter || result.isError) break;
      }
    }
  } catch (error) {
    emit({ stage: 'failure', kind: error.kind, status: error.status, code: error.code });
    process.exitCode = 1;
  } finally {
    await client.close();
    await transport.close();
  }
}
