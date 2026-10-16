import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkDocs, requiredDocs } from './check-clabs-docs.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'clabs-docs-guard-'));
  try {
    for (const path of requiredDocs) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), '# Document\n');
    }
    for (const path of ['AGENTS.md', 'README.md', 'CONTRIBUTING.md']) {
      writeFileSync(join(root, path), '[Working model](docs/clabs-working-model.md)\n');
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('valid entry points pass without network access', () => {
  fixture((root) => assert.deepEqual(checkDocs(root), []));
});

test('a missing delivery guide fails instead of silently passing', () => {
  fixture((root) => {
    rmSync(join(root, 'docs/clabs-delivery.md'));
    assert.ok(checkDocs(root).some((error) => error.includes('required document cannot be read')));
  });
});

test('a broken relative link is reported', () => {
  fixture((root) => {
    writeFileSync(join(root, 'docs/clabs-working-model.md'), '[Guide](missing.md)\n');
    assert.ok(checkDocs(root).some((error) => error.includes('broken local link missing.md')));
  });
});

test('a router that loses its working-model link fails', () => {
  fixture((root) => {
    writeFileSync(join(root, 'AGENTS.md'), '# Unrouted instructions\n');
    assert.ok(checkDocs(root).some((error) => error.includes('AGENTS.md: must link')));
  });
});

test('local links cannot escape the repository', () => {
  fixture((root) => {
    writeFileSync(join(root, 'docs/clabs-working-model.md'), '[Outside](../../outside.md)\n');
    assert.ok(checkDocs(root).some((error) => error.includes('local link leaves repository')));
  });
});
