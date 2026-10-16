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
