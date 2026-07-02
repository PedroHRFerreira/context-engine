import type { Command } from 'commander';
import { ContextDatabase } from '../database/database.js';
import { IndexerService } from '../services/indexer.js';
import { loadConfig } from '../services/config.js';
import { detectKind } from '../utils/kind.js';

export function registerIngestCommand(program: Command): void {
  program
    .command('ingest')
    .argument('<path>', 'file or directory to index')
    .option('--type <type>', 'content type')
    .description('Index a file or directory into searchable chunks')
    .action(async (targetPath: string, options: { type?: string }) => {
      const kind = options.type ? detectKind(targetPath, options.type) : undefined;
      const config = loadConfig();
      const db = new ContextDatabase(config);

      try {
        const indexer = new IndexerService(db, config);
        const summary = await indexer.ingestPath(targetPath, { type: kind });

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
