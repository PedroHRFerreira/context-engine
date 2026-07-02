import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkContent } from '../src/services/chunk.js';

test('chunkContent splits content by line limit', () => {
  const content = Array.from({ length: 121 }, (_, index) => `line ${index + 1}`).join('\n');
  const chunks = chunkContent(content, 120);

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0]?.startLine, 1);
  assert.equal(chunks[0]?.endLine, 120);
  assert.equal(chunks[1]?.startLine, 121);
  assert.equal(chunks[1]?.endLine, 121);
  assert.equal(chunks[1]?.content, 'line 121');
});
