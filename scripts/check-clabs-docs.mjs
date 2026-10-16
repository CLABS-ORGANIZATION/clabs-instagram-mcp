import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const requiredDocs = [
  'AGENTS.md',
  'README.md',
  'CONTRIBUTING.md',
  'CLABS-MAINTENANCE.md',
  'docs/clabs-working-model.md',
  'docs/clabs-delivery.md',
  'docs/clabs-verification.md',
  'docs/change-requests/cr-0001-maintenance-foundation.md',
];

export function checkDocs(root) {
  const errors = [];
  const sources = new Map();
  for (const path of requiredDocs) {
    try {
      const content = readFileSync(resolve(root, path), 'utf8');
      if (!content.trim()) errors.push(`${path}: document is empty`);
      sources.set(path, content);
    } catch {
      errors.push(`${path}: required document cannot be read`);
    }
  }
  for (const [path, content] of sources) {
    for (const match of content.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      const target = match[1];
      if (target.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(target)) continue;
      let local;
      try {
        local = decodeURIComponent(target.split('#')[0]);
      } catch {
        errors.push(`${path}: malformed link ${target}`);
        continue;
      }
      const destination = resolve(dirname(resolve(root, path)), local);
      const fromRoot = relative(resolve(root), destination);
      if (isAbsolute(local) || fromRoot === '..' || fromRoot.startsWith(`..${sep}`)) {
        errors.push(`${path}: local link leaves repository: ${target}`);
      } else if (!existsSync(destination)) {
        errors.push(`${path}: broken local link ${target}`);
      }
    }
  }
  for (const path of ['AGENTS.md', 'README.md', 'CONTRIBUTING.md']) {
    if (!sources.get(path)?.includes('](docs/clabs-working-model.md)')) {
      errors.push(`${path}: must link to the CLABS working model`);
    }
  }
  return errors;
}

const invokedAsScript =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const errors = checkDocs(root);
  if (errors.length) {
    process.stderr.write(`${errors.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('CLABS documentation links and entry points are valid.\n');
  }
}
