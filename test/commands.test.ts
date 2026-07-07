import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { getMissingBuildWarning } from '../src/commands/init.js';
import { planPackageUpdate } from '../src/commands/upgrade.js';

test('package.json includes prepare build script for git installs', async () => {
  const packageJson = JSON.parse(await fs.readFile(path.resolve('package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };

  assert.equal(packageJson.scripts.prepare, 'npm run build');
});

test('getMissingBuildWarning reports pnpm lifecycle blocking guidance when dist is absent', async () => {
  const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'context-package-root-'));
  const warning = await getMissingBuildWarning({ npm_config_user_agent: 'pnpm/9.0.0' }, packageRoot);

  assert.match(warning ?? '', /pnpm approve-builds/);
  assert.match(warning ?? '', /pnpm.onlyBuiltDependencies/);
});

test('planPackageUpdate skips linked rods-sdk dependencies', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-package-linked-'));

  for (const specifier of ['link:../ctx', 'file:../ctx', 'workspace:*', 'workspace:^', 'workspace:~']) {
    await fs.writeFile(
      path.join(root, 'package.json'),
      `${JSON.stringify({ devDependencies: { 'rods-sdk': specifier } }, null, 2)}\n`
    );
    await fs.writeFile(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');

    const plan = await planPackageUpdate(root);

    assert.equal(plan.status, 'skipped');
    assert.equal(plan.reason, 'linked-dependency');
    assert.equal(plan.specifier, specifier);
  }
});

test('planPackageUpdate detects package managers and ambiguous lockfiles', async () => {
  const pnpmRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'context-package-pnpm-'));
  await fs.writeFile(
    path.join(pnpmRoot, 'package.json'),
    `${JSON.stringify({ devDependencies: { 'rods-sdk': '^0.1.0' } }, null, 2)}\n`
  );
  await fs.writeFile(path.join(pnpmRoot, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  assert.deepEqual(await planPackageUpdate(pnpmRoot), {
    status: 'would-update',
    manager: 'pnpm',
    specifier: '^0.1.0',
    command: 'pnpm update rods-sdk',
    args: ['pnpm', 'update', 'rods-sdk']
  });

  const npmRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'context-package-npm-'));
  await fs.writeFile(
    path.join(npmRoot, 'package.json'),
    `${JSON.stringify({ devDependencies: { 'rods-sdk': '^0.1.0' } }, null, 2)}\n`
  );
  await fs.writeFile(path.join(npmRoot, 'package-lock.json'), '{}\n');
  assert.equal((await planPackageUpdate(npmRoot)).manager, 'npm');

  const yarnRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'context-package-yarn-'));
  await fs.writeFile(
    path.join(yarnRoot, 'package.json'),
    `${JSON.stringify({ packageManager: 'yarn@1.22.22', devDependencies: { 'rods-sdk': '^0.1.0' } }, null, 2)}\n`
  );
  await fs.writeFile(path.join(yarnRoot, 'yarn.lock'), '');
  assert.deepEqual(await planPackageUpdate(yarnRoot), {
    status: 'would-update',
    manager: 'yarn',
    specifier: '^0.1.0',
    command: 'yarn upgrade rods-sdk',
    args: ['yarn', 'upgrade', 'rods-sdk']
  });

  await fs.writeFile(path.join(yarnRoot, 'package-lock.json'), '{}\n');
  const ambiguous = await planPackageUpdate(yarnRoot);
  assert.equal(ambiguous.status, 'skipped');
  assert.equal(ambiguous.reason, 'ambiguous-lockfiles');
  assert.deepEqual(ambiguous.files, ['package-lock.json', 'yarn.lock']);
});
