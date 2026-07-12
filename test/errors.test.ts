import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCliError } from '../src/utils/errors.js';

test('CLI errors are concise by default and include a stack in debug mode', () => {
  const error = new Error('configuration failed');
  assert.equal(formatCliError(error, undefined), 'configuration failed');
  assert.match(formatCliError(error, '1'), /^Error: configuration failed\n/);
  assert.equal(formatCliError('plain failure', '1'), 'plain failure');
});
