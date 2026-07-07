import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Command } from 'commander';
import { ContextDatabase } from '../database/database.js';
import { inspectMigrations, type IMigrationReport } from '../database/migrations.js';
import { doctorAdapters, listAdapterTargets, loadGovernanceConfig, syncAdapters } from '../services/adapters.js';
import { getDefaultConfig, loadConfig } from '../services/config.js';
import { upgradeProject, upgradeProjectScripts } from '../services/scaffold.js';
import type { IContextConfig } from '../types/context.js';
import { getConfigPath, resolveConfiguredPath } from '../utils/paths.js';

type PackageManager = 'npm' | 'pnpm' | 'yarn';

export type PackageUpdatePlan =
  | { status: 'would-update'; manager: PackageManager; command: string; args: string[]; specifier?: string }
  | { status: 'skipped'; reason: string; specifier?: string; files?: string[] };

interface IPackageJson {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export function registerUpgradeCommand(program: Command): void {
  program
    .command('upgrade')
    .argument('[path]', 'project root path', '.')
    .option('--force', 'overwrite generated files even when customized')
    .option('--dry-run', 'show planned changes without writing files')
    .description('Upgrade rods-sdk governance files and Context Engine schema')
    .action(async (targetPath: string, options: { force?: boolean; dryRun?: boolean }) => {
      const root = path.resolve(targetPath);
      let warnings = 0;

      if (options.dryRun) {
        const packagePlan = await planPackageUpdate(root);
        console.log(formatPackagePlan(packagePlan));
      } else {
        const packagePlan = await planPackageUpdate(root);

        if (packagePlan.status === 'skipped') {
          console.log(formatPackagePlan(packagePlan));
        } else {
          const update = await updateInstalledPackage(root, packagePlan.args);
          console.log(`package=rods-sdk status=${update.ok ? 'updated' : 'skipped'} message=${quoteValue(update.message)}`);

          if (!update.ok) {
            warnings += 1;
          }
        }
      }

      const migrationReports = options.dryRun ? await inspectContextDatabase() : migrateContextDatabase();

      for (const report of migrationReports) {
        console.log(formatMigrationReport(report));
      }

      const results = await upgradeProject(root, {
        force: options.force,
        dryRun: options.dryRun
      });

      for (const result of results) {
        console.log(`file=${result.path} status=${result.status}`);

        if (result.upstreamChanged) {
          console.log(`customized_with_newer_upstream=${result.path}`);
        }
      }

      const scriptResults = await upgradeProjectScripts(root, {
        force: options.force,
        dryRun: options.dryRun
      });

      for (const result of scriptResults) {
        console.log(`script=${result.script} status=${result.status}`);
      }

      const config = await loadGovernanceConfig(root);
      const targets = listAdapterTargets()
        .map((target) => target.id)
        .filter((target) => config.targets[target]?.enabled);

      for (const target of targets) {
        if (options.dryRun) {
          console.log(`target=${target} status=would-sync`);
          continue;
        }

        try {
          const syncResult = await syncAdapters(root, target, { force: options.force });
          const parts = [`target=${syncResult.target}`, `status=${syncResult.status}`];

          if (syncResult.path) {
            parts.push(`path=${syncResult.path}`);
          }

          if (syncResult.fallback) {
            parts.push('fallback=true');
          }

          if (syncResult.reason) {
            parts.push(`reason=${quoteValue(syncResult.reason)}`);
          }

          console.log(parts.join(' '));

          if (syncResult.status === 'skipped') {
            warnings += 1;
          }

          for (const file of syncResult.files) {
            console.log(`file=${file.path} status=${file.status}`);
          }

          const reports = await doctorAdapters(root, { target });
          const failed = reports.filter((report) => report.enabled && !report.installed);

          if (failed.length > 0) {
            warnings += failed.length;
          }
        } catch (error) {
          warnings += 1;
          console.log(`target=${target} status=skipped reason=${quoteValue(formatError(error))}`);
        }
      }

      console.log(`upgrade=status=completed warnings=${warnings}`);
    });
}

function migrateContextDatabase(): IMigrationReport[] {
  const db = new ContextDatabase(loadConfig());
  const reports = db.migrationReports;
  db.close();
  return reports;
}

async function inspectContextDatabase(): Promise<IMigrationReport[]> {
  const config = await readContextConfigIfExists();
  const databasePath = resolveConfiguredPath(config.database);

  if (!(await pathExists(databasePath))) {
    return [
      { migration: 'scope-column', status: 'would-migrate' },
      { migration: 'cache-scope-column', status: 'would-migrate' }
    ];
  }

  const db = new Database(databasePath, { readonly: true, fileMustExist: true });

  try {
    return inspectMigrations(db);
  } finally {
    db.close();
  }
}

async function readContextConfigIfExists(): Promise<IContextConfig> {
  const configPath = getConfigPath();

  if (!(await pathExists(configPath))) {
    return getDefaultConfig();
  }

  const parsedConfig = JSON.parse(await fs.readFile(configPath, 'utf8')) as Partial<IContextConfig>;

  return {
    ...getDefaultConfig(),
    ...parsedConfig,
    ignore: parsedConfig.ignore ?? getDefaultConfig().ignore
  };
}

export async function planPackageUpdate(root: string): Promise<PackageUpdatePlan> {
  const packageJsonPath = path.join(root, 'package.json');
  const packageJson = await readPackageJson(packageJsonPath);

  if (!packageJson) {
    return { status: 'skipped', reason: 'missing-package-json' };
  }

  const specifier = findRodsSpecifier(packageJson);

  if (!specifier) {
    return { status: 'skipped', reason: 'missing-dependency' };
  }

  if (isLinkedSpecifier(specifier)) {
    return { status: 'skipped', reason: 'linked-dependency', specifier };
  }

  const lockfiles = await detectLockfiles(root);

  if (lockfiles.length > 1) {
    return { status: 'skipped', reason: 'ambiguous-lockfiles', specifier, files: lockfiles.map((lockfile) => lockfile.file) };
  }

  const manager = lockfiles[0]?.manager ?? detectPackageManagerField(packageJson.packageManager);

  if (!manager) {
    return { status: 'skipped', reason: 'missing-lockfile', specifier };
  }

  return {
    status: 'would-update',
    manager,
    specifier,
    command: getPackageUpdateArgs(manager, packageJson.packageManager).join(' '),
    args: getPackageUpdateArgs(manager, packageJson.packageManager)
  };
}

function updateInstalledPackage(root: string, commandArgs: string[]): Promise<{ ok: boolean; message: string }> {
  const [command, ...args] = commandArgs;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stderr = '';

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      resolve({ ok: false, message: error.message });
    });
    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        message: code === 0 ? [command, ...args].join(' ') : firstLine(stderr) ?? `${command} exited with ${code}`
      });
    });
  });
}

function getPackageUpdateArgs(manager: PackageManager, packageManagerField?: string): string[] {
  if (manager === 'pnpm') {
    return ['pnpm', 'update', 'rods-sdk'];
  }

  if (manager === 'yarn') {
    if (packageManagerField?.startsWith('yarn@1.')) {
      return ['yarn', 'upgrade', 'rods-sdk'];
    }

    return ['yarn', 'up', 'rods-sdk'];
  }

  return ['npm', 'update', 'rods-sdk'];
}

async function readPackageJson(packageJsonPath: string): Promise<IPackageJson | null> {
  try {
    return JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as IPackageJson;
  } catch {
    return null;
  }
}

function findRodsSpecifier(packageJson: IPackageJson): string | undefined {
  return (
    packageJson.dependencies?.['rods-sdk'] ??
    packageJson.devDependencies?.['rods-sdk'] ??
    packageJson.optionalDependencies?.['rods-sdk']
  );
}

function isLinkedSpecifier(specifier: string): boolean {
  return specifier.startsWith('link:') || specifier.startsWith('file:') || specifier.startsWith('workspace:');
}

async function detectLockfiles(root: string): Promise<Array<{ file: string; manager: PackageManager }>> {
  const candidates: Array<{ file: string; manager: PackageManager }> = [
    { file: 'pnpm-lock.yaml', manager: 'pnpm' },
    { file: 'package-lock.json', manager: 'npm' },
    { file: 'yarn.lock', manager: 'yarn' }
  ];
  const existing: Array<{ file: string; manager: PackageManager }> = [];

  for (const candidate of candidates) {
    if (await pathExists(path.join(root, candidate.file))) {
      existing.push(candidate);
    }
  }

  return existing;
}

function detectPackageManagerField(packageManager: string | undefined): PackageManager | undefined {
  if (packageManager?.startsWith('pnpm@')) {
    return 'pnpm';
  }

  if (packageManager?.startsWith('npm@')) {
    return 'npm';
  }

  if (packageManager?.startsWith('yarn@')) {
    return 'yarn';
  }

  return undefined;
}

function formatPackagePlan(plan: PackageUpdatePlan): string {
  if (plan.status === 'skipped') {
    const parts = ['package=rods-sdk', 'status=skipped', `reason=${plan.reason}`];

    if (plan.specifier) {
      parts.push(`specifier=${plan.specifier}`);
    }

    if (plan.files?.length) {
      parts.push(`files=${plan.files.join(',')}`);
    }

    return parts.join(' ');
  }

  return `package=rods-sdk status=would-update manager=${plan.manager} command=${quoteValue(plan.command)}`;
}

function formatMigrationReport(report: IMigrationReport): string {
  const parts = [`context_database=${report.status}`, `migration=${report.migration}`];

  if (report.reason) {
    parts.push(`reason=${report.reason}`);
  }

  return parts.join(' ');
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function quoteValue(input: string): string {
  return `"${input.replace(/"/g, '\\"')}"`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

function firstLine(input: string): string | undefined {
  const trimmed = input.trim();

  return trimmed ? trimmed.split(/\r?\n/, 1)[0] : undefined;
}
