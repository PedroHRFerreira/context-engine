import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { initProject, upgradeProject, upgradeProjectScripts } from '../src/services/scaffold.js';
import { sha256 } from '../src/utils/hash.js';

test('initProject scaffolds governance files and preserves existing files by default', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-init-'));
  const firstRun = await initProject(root);

  assert.equal(firstRun.length, 16);
  assert.ok(firstRun.every((result) => result.status === 'created'));

  const configPath = path.join(root, '.ai', 'config.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8')) as {
    project: string;
    execution: { mode: string; apiEnabled: boolean };
    escalation: { rulesDir: string };
    adapters: { rtk: { enabled: boolean }; 'context-mode'?: { enabled: boolean } };
    generatedTemplates: Record<string, string>;
  };

  assert.equal(config.project, path.basename(root));
  assert.deepEqual(config.execution, { mode: 'cli', apiEnabled: false });
  assert.equal(config.escalation.rulesDir, 'spec');
  assert.equal(config.adapters.rtk.enabled, true);
  assert.equal(config.adapters['context-mode'], undefined);
  assert.ok(config.generatedTemplates['AGENTS.md']);
  assert.match(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8'), /Rods SDK Defaults/);
  assert.match(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8'), /Reading Map/);
  assert.match(await fs.readFile(path.join(root, '.ai', 'adapters', 'rtk.md'), 'utf8'), /default rods-sdk/);
  assert.match(
    await fs.readFile(path.join(root, '.ai', 'skills', 'context-search-first', 'SKILL.md'), 'utf8'),
    /name: context-search-first/
  );
  assert.match(await fs.readFile(path.join(root, '.ai', 'skills', 'review', 'SKILL.md'), 'utf8'), /name: review/);
  assert.match(await fs.readFile(path.join(root, '.ai', 'policies', 'complexity.md'), 'utf8'), /maxFiles: 2/);
  assert.match(await fs.readFile(path.join(root, '.ai', 'skills', 'design-brainstorm', 'SKILL.md'), 'utf8'), /design-brainstorm/);
  assert.match(await fs.readFile(path.join(root, '.ai', 'skills', 'parallel-delivery', 'SKILL.md'), 'utf8'), /name: parallel-delivery/);
  assert.match(await fs.readFile(path.join(root, '.ai', 'skills', 'visual-check', 'SKILL.md'), 'utf8'), /name: visual-check/);
  assert.match(await fs.readFile(path.join(root, '.ai', 'skills', 'rules-capture', 'SKILL.md'), 'utf8'), /name: rules-capture/);
  assert.match(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8'), /feature spanning domain, UI, and routing/);
  assert.match(await fs.readFile(path.join(root, '.ai', 'adapters', 'codex', 'capabilities.md'), 'utf8'), /harness: codex/);
  assert.equal(await fs.readFile(path.join(root, '.rods', '.gitignore'), 'utf8'), '*\n!.gitignore\n');

  await fs.writeFile(path.join(root, 'AGENTS.md'), 'custom');
  const secondRun = await initProject(root);
  const agentsResult = secondRun.find((result) => result.path.endsWith('AGENTS.md'));

  assert.equal(agentsResult?.status, 'skipped');
  assert.equal(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8'), 'custom');

  const forcedRun = await initProject(root, { force: true });
  const forcedAgentsResult = forcedRun.find((result) => result.path.endsWith('AGENTS.md'));

  assert.equal(forcedAgentsResult?.status, 'overwritten');
  assert.match(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8'), /Rods SDK Defaults/);
});

test('upgradeProject supports dry-run and reports customized generated files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-upgrade-'));
  await initProject(root);

  await fs.writeFile(path.join(root, 'AGENTS.md'), 'custom');
  const visualCheckPath = path.join(root, '.ai', 'skills', 'visual-check', 'SKILL.md');
  await fs.rm(visualCheckPath);

  const dryRun = await upgradeProject(root, { dryRun: true });
  const agentsDryRun = dryRun.find((result) => result.path.endsWith('AGENTS.md'));
  const visualCheckDryRun = dryRun.find((result) => result.path === visualCheckPath);

  assert.equal(agentsDryRun?.status, 'would-skip-customized');
  assert.equal(visualCheckDryRun?.status, 'would-create');
  assert.equal(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8'), 'custom');

  const forced = await upgradeProject(root, { force: true });
  const agentsForced = forced.find((result) => result.path.endsWith('AGENTS.md'));

  assert.equal(agentsForced?.status, 'overwritten');
  assert.match(await fs.readFile(visualCheckPath, 'utf8'), /name: visual-check/);
  assert.match(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8'), /Rods SDK Defaults/);
});

test('delivery and visual skills preserve their workflow invariants', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-skills-'));
  await initProject(root);

  const skillsRoot = path.join(root, '.ai', 'skills');
  const delivery = await fs.readFile(path.join(skillsRoot, 'parallel-delivery', 'SKILL.md'), 'utf8');
  const deliveryGraph = delivery.split('## Delivery Graph\n\n')[1]?.split('\n## Execution Rules')[0] ?? '';
  const quality = await fs.readFile(path.join(skillsRoot, 'quality', 'SKILL.md'), 'utf8');
  const review = await fs.readFile(path.join(skillsRoot, 'review', 'SKILL.md'), 'utf8');
  const visual = await fs.readFile(path.join(skillsRoot, 'visual-check', 'SKILL.md'), 'utf8');
  const rules = await fs.readFile(path.join(skillsRoot, 'rules-capture', 'SKILL.md'), 'utf8');

  assert.equal(deliveryGraph.match(/^\d+\. \*\*/gm)?.length, 6);
  assert.match(deliveryGraph, /depends on agents 1 and 2/);
  assert.match(deliveryGraph, /starts only after agents 3, 4, and 5/);
  assert.match(quality, /Visual Validation \(UI Changes Only\)/);
  assert.match(review, /visual-check/);
  assert.match(visual, /pnpm dlx playwright install chromium/);
  assert.match(visual, /Never claim or simulate visual validation/);
  assert.match(rules, /<rulesDir>\/<branch>\/rules\.md/);
  assert.match(rules, /git branch --show-current/);
});

test('upgradeProjectScripts creates scripts and preserves customized entries', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'context-upgrade-scripts-'));
  await fs.writeFile(
    path.join(root, 'package.json'),
    `${JSON.stringify({ scripts: { 'context:stats': 'custom stats' } }, null, 2)}\n`
  );
  await initProject(root);

  const dryRun = await upgradeProjectScripts(root, { dryRun: true });
  assert.equal(dryRun.find((result) => result.script === 'rods:upgrade')?.status, 'would-create');
  assert.equal(dryRun.find((result) => result.script === 'context:stats')?.status, 'skipped-customized');

  const firstRun = await upgradeProjectScripts(root);
  assert.equal(firstRun.find((result) => result.script === 'rods:upgrade')?.status, 'created');
  assert.equal(firstRun.find((result) => result.script === 'context:stats')?.status, 'skipped-customized');

  const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const config = JSON.parse(await fs.readFile(path.join(root, '.ai', 'config.json'), 'utf8')) as {
    generatedScripts: Record<string, string>;
  };

  assert.equal(packageJson.scripts['rods:upgrade'], 'rods upgrade .');
  assert.equal(packageJson.scripts['context:stats'], 'custom stats');
  assert.ok(config.generatedScripts['rods:upgrade']);

  const secondRun = await upgradeProjectScripts(root);
  assert.equal(secondRun.find((result) => result.script === 'rods:upgrade')?.status, 'unchanged');

  await fs.writeFile(
    path.join(root, 'package.json'),
    `${JSON.stringify({ scripts: { ...packageJson.scripts, 'rods:upgrade': 'custom upgrade' } }, null, 2)}\n`
  );
  const forced = await upgradeProjectScripts(root, { force: true });
  assert.equal(forced.find((result) => result.script === 'rods:upgrade')?.status, 'skipped-customized');

  const oldGenerated = 'rods old-upgrade .';
  const configPath = path.join(root, '.ai', 'config.json');
  const nextConfig = JSON.parse(await fs.readFile(configPath, 'utf8')) as {
    generatedScripts: Record<string, string>;
  };
  nextConfig.generatedScripts['rods:upgrade'] = sha256(oldGenerated);
  await fs.writeFile(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`);
  await fs.writeFile(
    path.join(root, 'package.json'),
    `${JSON.stringify({ scripts: { ...packageJson.scripts, 'rods:upgrade': oldGenerated } }, null, 2)}\n`
  );

  const forcedGenerated = await upgradeProjectScripts(root, { force: true });
  assert.equal(forcedGenerated.find((result) => result.script === 'rods:upgrade')?.status, 'overwritten');
});

test('initProject detects stack from lockfiles and Go files', async () => {
  const nodeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'context-stack-node-'));
  await fs.writeFile(path.join(nodeRoot, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  await initProject(nodeRoot);

  assert.match(await fs.readFile(path.join(nodeRoot, 'AGENTS.md'), 'utf8'), /Detected stack: Node\/TypeScript/);

  const goRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'context-stack-go-'));
  await fs.writeFile(path.join(goRoot, 'main.go'), 'package main\n');
  await initProject(goRoot);

  assert.match(await fs.readFile(path.join(goRoot, 'AGENTS.md'), 'utf8'), /Detected stack: Go/);
});
