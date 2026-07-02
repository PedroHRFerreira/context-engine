import type { Command } from 'commander';
import { ContextDatabase } from '../database/database.js';
import { loadConfig } from '../services/config.js';

export function registerStatsCommand(program: Command): void {
  program
    .command('stats')
    .description('Show compact index statistics')
    .action(() => {
      const config = loadConfig();
      const db = new ContextDatabase(config);

      try {
        const stats = db.stats();

        console.log(`projects=${stats.projects}`);
        console.log(`files=${stats.files}`);
        console.log(`chunks=${stats.chunks}`);
        console.log(`databaseBytes=${stats.databaseBytes}`);
      } finally {
        db.close();
      }
    });
}
