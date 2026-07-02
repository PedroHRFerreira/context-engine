import path from 'node:path';

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  '.cjs': 'javascript',
  '.css': 'css',
  '.diff': 'diff',
  '.go': 'go',
  '.html': 'html',
  '.js': 'javascript',
  '.json': 'json',
  '.jsx': 'javascript',
  '.log': 'log',
  '.md': 'markdown',
  '.mjs': 'javascript',
  '.patch': 'diff',
  '.py': 'python',
  '.scss': 'scss',
  '.sql': 'sql',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.txt': 'text',
  '.vue': 'vue',
  '.yaml': 'yaml',
  '.yml': 'yaml'
};

export function detectLanguage(filePath: string): string {
  return LANGUAGE_BY_EXTENSION[path.extname(filePath).toLowerCase()] ?? 'text';
}
