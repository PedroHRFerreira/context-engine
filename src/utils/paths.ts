import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function expandHome(input: string): string {
  if (input === '~') {
    return os.homedir();
  }

  if (input.startsWith('~/')) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

export function getContextHome(): string {
  const configuredHome = process.env.CONTEXT_ENGINE_HOME;
  return configuredHome ? path.resolve(expandHome(configuredHome)) : path.join(os.homedir(), '.context-engine');
}

export function getConfigPath(): string {
  return path.join(getContextHome(), 'config', 'config.json');
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function resolveConfiguredPath(input: string): string {
  return path.resolve(expandHome(input.replace(/^~\/\.context-engine/, getContextHome())));
}

export function toPosixPath(input: string): string {
  return input.split(path.sep).join('/');
}
