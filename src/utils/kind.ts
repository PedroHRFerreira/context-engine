import path from 'node:path';
import type { TContextKind } from '../types/context.js';

const VALID_KINDS = new Set<TContextKind>([
  'file',
  'log',
  'diff',
  'markdown',
  'error',
  'stacktrace',
  'json',
  'sql',
  'http'
]);

export function isContextKind(input: string): input is TContextKind {
  return VALID_KINDS.has(input as TContextKind);
}

export function detectKind(filePath: string, explicitKind?: string): TContextKind {
  if (explicitKind) {
    if (!isContextKind(explicitKind)) {
      throw new Error(`Invalid type: ${explicitKind}`);
    }

    return explicitKind;
  }

  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.log') return 'log';
  if (extension === '.md' || extension === '.mdx') return 'markdown';
  if (extension === '.json') return 'json';
  if (extension === '.sql') return 'sql';
  if (extension === '.diff' || extension === '.patch') return 'diff';

  return 'file';
}
