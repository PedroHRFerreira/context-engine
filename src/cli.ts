import { Command } from 'commander';
import { registerIngestCommand } from './commands/ingest.js';
import { registerProjectsCommand } from './commands/projects.js';
import { registerReadCommand } from './commands/read.js';
import { registerSearchCommand } from './commands/search.js';
import { registerStatsCommand } from './commands/stats.js';

const program = new Command();

program.name('context').description('Local context memory for AI agents').version('0.1.0').showHelpAfterError();

registerIngestCommand(program);
registerSearchCommand(program);
registerReadCommand(program);
registerStatsCommand(program);
registerProjectsCommand(program);

try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
