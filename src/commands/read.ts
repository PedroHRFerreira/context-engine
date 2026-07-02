import type { Command } from 'commander';
import { ContextDatabase } from '../database/database.js';
import { loadConfig } from '../services/config.js';

export function registerReadCommand(program: Command): void {
  program
    .command('read')
    .argument('<chunkId>', 'chunk id to read')
    .description('Read one indexed chunk by id')
    .action((chunkId: string) => {
      const id = Number.parseInt(chunkId, 10);

      if (!Number.isInteger(id) || id < 1) {
        throw new Error(`Invalid chunk id: ${chunkId}`);
      }

      const config = loadConfig();
      const db = new ContextDatabase(config);

      try {
        const chunk = db.getChunk(id);

        if (!chunk) {
          console.log(`chunk_not_found=${id}`);
          process.exitCode = 1;
          return;
        }

        console.log(chunk.path);
        console.log(`lines=${chunk.startLine}-${chunk.endLine} type=${chunk.kind} language=${chunk.language}`);
        console.log('');
        console.log(chunk.content);
      } finally {
        db.close();
      }
    });
}
