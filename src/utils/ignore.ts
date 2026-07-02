import fs from 'node:fs';
import path from 'node:path';
import ignore from 'ignore';
import { toPosixPath } from './paths.js';

export const DEFAULT_IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.nuxt',
  '.output',
  'dist',
  'coverage',
  '.cache',
  '.next'
];

export interface IIgnoreFilter {
  patterns: string[];
  shouldIgnore(filePath: string): boolean;
}

export function loadGitignorePatterns(root: string): string[] {
  const gitignorePath = path.join(root, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  return fs
    .readFileSync(gitignorePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function buildIgnoreFilter(root: string, extraPatterns: string[] = []): IIgnoreFilter {
  const patterns = [...DEFAULT_IGNORE_PATTERNS, ...extraPatterns, ...loadGitignorePatterns(root)];
  const matcher = ignore().add(patterns);

  return {
    patterns,
    shouldIgnore(filePath: string): boolean {
      const relativePath = toPosixPath(path.relative(root, filePath));

      if (!relativePath || relativePath.startsWith('..')) {
        return false;
      }

      return matcher.ignores(relativePath) || matcher.ignores(`${relativePath}/`);
    }
  };
}
