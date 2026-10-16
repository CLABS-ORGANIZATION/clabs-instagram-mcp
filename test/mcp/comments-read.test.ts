import assert from 'node:assert/strict';
import { test } from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from '../../src/mcp/registry.js';
import { commentsTools } from '../../src/tools/comments.js';
import { createIgRequest } from '../../src/core/http.js';
import { createAuthProvider } from '../../src/core/auth.js';
import type { Logger } from '../../src/core/types.js';
import { fakeClock } from '../helpers/fake-clock.js';
import { testSettings } from '../helpers/settings.js';

// Structural fixtures from Bug #2, with synthetic identifiers only. Exercise
// HTTP parsing -> API -> registry -> actual MCP protocol/schema validation.
test('comments read protocol distinguishes terminal, continuing, malformed and denied pages (CR-0003)', async () => {
  const profile = {
    name: 'default',
    authPath: 'ig-login' as const,
    accessToken: 'SYNTHETIC_TOKEN',
  };
  const settings = testSettings();
  const clock = fakeClock(0);
  const log: Logger = { debug() {}, info() {}, warn() {}, error() {}, child: () => log };
  const requests: URL[] = [];
  const req = createIgRequest({
    auth: createAuthProvider(profile),
    settings,
    clock,
    log,
    fetchImpl: (input, init) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      );
      requests.push(url);
      assert.equal(init?.method, 'GET');
      assert.equal(url.hostname, 'graph.instagram.com');
      const media = url.pathname.split('/')[2];
      const body =
        media === 'malformed'
          ? {}
          : media === 'denied'
            ? { error: { message: 'Synthetic denial', type: 'OAuthException', code: 10 } }
            : {
                data: [],
                paging: {
                  cursors: { after: 'SYNTHETIC_CURSOR' },
                  ...(media === 'continued'
                    ? { next: 'https://untrusted.invalid/never-follow' }
                    : {}),
                },
              };
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: media === 'denied' ? 403 : 200 }),
      );
    },
  });
  const server = new McpServer({ name: 'comments-regression', version: '0.0.0' });
  registerTools({
    server,
    tools: commentsTools,
    profiles: [profile],
    defaultProfileName: 'default',
    settings,
    clock,
    log,
    makeRequest: () => req,
    env: { IG_TOOL_PACKAGES: 'reader' },
  });
  const client = new Client({ name: 'comments-regression-client', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const listed = await client.listTools();
    assert.ok(listed.tools.every((tool) => tool.annotations?.readOnlyHint === true));
    const terminal = await client.callTool({
      name: 'instagram_list_comments',
      arguments: { account: 'default', mediaId: 'terminal', fetchAll: true },
    });
    assert.equal(terminal.isError, undefined);
    const terminalData = terminal.structuredContent as Record<string, unknown>;
    assert.deepEqual(terminalData.paging, { truncated: false });
    assert.deepEqual(terminalData.items, []);
    assert.match(String(terminalData.note), /counts do not prove API access/);
    const continued = await client.callTool({
      name: 'instagram_list_comments',
      arguments: { account: 'default', mediaId: 'continued', fetchAll: true },
    });
    const continuedData = continued.structuredContent as Record<string, unknown>;
    assert.deepEqual(continuedData.paging, {
      truncated: true,
      after: 'SYNTHETIC_CURSOR',
    });
    assert.match(String(continuedData.note), /does not establish why/);
    for (const mediaId of ['malformed', 'denied']) {
      const result = await client.request(
        {
          method: 'tools/call',
          params: { name: 'instagram_list_comments', arguments: { account: 'default', mediaId } },
        },
        CallToolResultSchema,
      );
      assert.equal(result.isError, true);
      assert.ok(result.structuredContent, 'error envelope is preserved by the registry');
      const text = result.content as Array<{ type: string; text?: string }>;
      assert.match(String(text[0]?.text), mediaId === 'malformed' ? /upstream/ : /permission/);
    }
    assert.equal(requests.length, 4, 'no speculative follow-up and no followed next URL');
  } finally {
    await client.close();
    await server.close();
  }
});

// Official Comments/IG Comment contracts, not real API certification. A numeric
// ID above Number.MAX_SAFE_INTEGER and an opaque cursor catch accidental mapping
// or encoding changes across tool -> API -> URL -> HTTP -> MCP.
test('comments protocol preserves IDs, params and nested replies while bounding HTTP pages to 50', async () => {
  const mediaId = '18019730000000001';
  const cursor = 'SYNTHETIC+CURSOR/with=padding';
  const profile = {
    name: 'default',
    authPath: 'ig-login' as const,
    accessToken: 'SYNTHETIC+TOKEN',
  };
  const settings = testSettings();
  const clock = fakeClock(0);
  const log: Logger = { debug() {}, info() {}, warn() {}, error() {}, child: () => log };
  const urls: URL[] = [];
  const inits: Array<RequestInit | undefined> = [];
  const req = createIgRequest({
    auth: createAuthProvider(profile),
    settings,
    clock,
    log,
    fetchImpl: (input, init) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      );
      urls.push(url);
      inits.push(init);
      if (urls.length === 1) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  id: '18000000000000001',
                  text: 'SYNTHETIC_COMMENT',
                  username: 'SYNTHETIC_AUTHOR',
                  timestamp: '2026-01-01T00:00:00+0000',
                  like_count: 7,
                  replies: {
                    data: [
                      {
                        id: '18000000000000002',
                        text: 'SYNTHETIC_REPLY',
                        username: 'SYNTHETIC_REPLY_AUTHOR',
                      },
                    ],
                  },
                },
              ],
              paging: {
                cursors: { after: cursor },
                next: 'https://untrusted.invalid/never-follow',
              },
            }),
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: [{ id: '18000000000000003' }],
            paging: { cursors: { after: 'SYNTHETIC_TERMINAL' } },
          }),
        ),
      );
    },
  });
  const server = new McpServer({ name: 'comments-contract', version: '0.0.0' });
  registerTools({
    server,
    tools: commentsTools,
    profiles: [profile],
    defaultProfileName: 'default',
    settings,
    clock,
    log,
    makeRequest: () => req,
    env: { IG_TOOL_PACKAGES: 'reader' },
  });
  const client = new Client({ name: 'comments-contract-client', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({
      name: 'instagram_list_comments',
      arguments: { account: 'default', mediaId, limit: 100, fetchAll: true },
    });
    assert.equal(result.isError, undefined);
    const payload = result.structuredContent as {
      items: Array<{
        id: string;
        text?: string;
        username?: string;
        timestamp?: string;
        like_count?: number;
        replies?: Array<{ id: string; text?: string; username?: string }>;
      }>;
      paging: { after?: string; truncated: boolean };
    };
    assert.deepEqual(
      payload.items.map((c) => c.id),
      ['18000000000000001', '18000000000000003'],
    );
    assert.equal(payload.items[0]?.like_count, 7);
    assert.equal(payload.items[0]?.timestamp, '2026-01-01T00:00:00+0000');
    assert.match(String(payload.items[0]?.text), /SYNTHETIC_COMMENT/);
    assert.match(String(payload.items[0]?.username), /SYNTHETIC_AUTHOR/);
    assert.equal(payload.items[0]?.replies?.[0]?.id, '18000000000000002');
    assert.match(String(payload.items[0]?.replies?.[0]?.text), /SYNTHETIC_REPLY/);
    assert.match(String(payload.items[0]?.replies?.[0]?.username), /SYNTHETIC_REPLY_AUTHOR/);
    assert.equal(payload.items[1]?.replies, undefined);
    assert.deepEqual(payload.paging, { truncated: false });
    assert.equal(urls.length, 2);
    for (const [index, url] of urls.entries()) {
      assert.equal(inits[index]?.method, 'GET');
      assert.equal(inits[index]?.body, undefined);
      assert.equal(url.origin, 'https://graph.instagram.com');
      assert.equal(url.pathname, `/v25.0/${mediaId}/comments`);
      assert.equal(url.searchParams.get('limit'), '50');
      assert.equal(url.searchParams.get('access_token'), profile.accessToken);
      assert.equal(
        url.searchParams.get('fields'),
        'id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}',
      );
      assert.deepEqual(
        [...url.searchParams.keys()].sort(),
        (index === 0
          ? ['access_token', 'fields', 'limit']
          : ['access_token', 'after', 'fields', 'limit']
        ).sort(),
      );
      assert.equal(url.searchParams.get('after'), index === 0 ? null : cursor);
    }
  } finally {
    await client.close();
    await server.close();
  }
});
