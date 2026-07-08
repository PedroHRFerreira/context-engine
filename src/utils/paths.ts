import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT_ROOT_MARKERS = [
  '.git',
  '.ai',
  '.gitignore',
  'AGENTS.md',
  'package.json',
  'pnpm-workspace.yaml',
  'turbo.json',
  'go.mod',
  'Cargo.toml',
  'pyproject.toml'
];

export function expandHome(input: string): string {
  if (input === '~') {
    return os.homedir();
  }

  if (input.startsWith('~/')) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

export function resolveFromBase(input: string, baseDir = process.cwd()): string {
  const expanded = expandHome(input);
  return path.isAbsolute(expanded) ? path.normalize(expanded) : path.resolve(baseDir, expanded);
}

export function getContextHome(baseDir = process.cwd()): string {
  const configuredHome = process.env.CONTEXT_ENGINE_HOME;
  return configuredHome ? resolveFromBase(configuredHome, baseDir) : path.join(os.homedir(), '.context-engine');
}

export function getConfigPath(baseDir = process.cwd()): string {
  return path.join(getContextHome(baseDir), 'config', 'config.json');
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function resolveConfiguredPath(input: string, baseDir = process.cwd()): string {
  const contextHome = getContextHome(baseDir);
  return resolveFromBase(input.replace(/^~\/\.context-engine(?=\/|$)/, contextHome), baseDir);
}

export function toPosixPath(input: string): string {
  return input.split(path.sep).join('/');
}

export function detectProjectRoot(inputPath: string): string | null {
  let currentPath = path.resolve(inputPath);

  if (fs.existsSync(currentPath) && !fs.statSync(currentPath).isDirectory()) {
    currentPath = path.dirname(currentPath);
  }

  while (true) {
    if (PROJECT_ROOT_MARKERS.some((marker) => fs.existsSync(path.join(currentPath, marker)))) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);

    if (parentPath === currentPath) {
      return null;
    }

    currentPath = parentPath;
  }
}

export function resolveProjectRoot(inputPath: string, explicitProjectRoot?: string): string | null {
  return explicitProjectRoot ? path.resolve(explicitProjectRoot) : detectProjectRoot(inputPath);
}
