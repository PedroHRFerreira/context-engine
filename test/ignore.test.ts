import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildIgnoreFilter } from '../src/utils/ignore.js';

test('buildIgnoreFilter respects defaults and .gitignore', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-ignore-'));
  await fs.writeFile(path.join(root, '.gitignore'), 'secret.txt\n');

  const filter = buildIgnoreFilter(root);

  assert.equal(filter.shouldIgnore(path.join(root, 'node_modules', 'pkg', 'index.js')), true);
  assert.equal(filter.shouldIgnore(path.join(root, '.git', 'config')), true);
  assert.equal(filter.shouldIgnore(path.join(root, 'secret.txt')), true);
  assert.equal(filter.shouldIgnore(path.join(root, 'src', 'index.ts')), false);
});
