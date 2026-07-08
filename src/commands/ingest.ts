import fs from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import { ContextDatabase } from '../database/database.js';
import { IndexerService, normalizeScope } from '../services/indexer.js';
import { loadConfig } from '../services/config.js';
import { detectKind } from '../utils/kind.js';
import { resolveProjectRoot } from '../utils/paths.js';

export function registerIngestCommand(program: Command): void {
  program
    .command('ingest')
    .argument('<path>', 'file or directory to index')
    .option('--type <type>', 'content type')
    .option('--scope <scope>', 'index scope', 'general')
    .option('--project-root <path>', 'project root for ignore resolution and relative CONTEXT_ENGINE_HOME')
    .description('Index a file or directory into searchable chunks')
    .action(async (targetPath: string, options: { type?: string; scope?: string; projectRoot?: string }) => {
      const kind = options.type ? detectKind(targetPath, options.type) : undefined;
      const scope = normalizeScope(options.scope);
      const absoluteTargetPath = path.resolve(targetPath);
      const targetStat = await fs.stat(absoluteTargetPath);
      const projectRoot = resolveProjectRoot(absoluteTargetPath, options.projectRoot);
      const baseDir = projectRoot ?? (targetStat.isDirectory() ? absoluteTargetPath : path.dirname(absoluteTargetPath));
      const config = loadConfig(baseDir);
      const db = new ContextDatabase(config, { baseDir });

      try {
        const indexer = new IndexerService(db, config);
        const summary = await indexer.ingestPath(absoluteTargetPath, {
          type: kind,
          scope,
          projectRoot: projectRoot ?? undefined
        });

        console.log(
          `indexed=${summary.indexed} skipped=${summary.skipped} ignored=${summary.ignored} failed=${summary.failed} chunks=${summary.chunks}`
        );

        for (const error of summary.errors) {
          console.error(`error=${error}`);
        }

        if (summary.failed > 0) {
          process.exitCode = 1;
        }
      } finally {
        db.close();
      }
    });
}
