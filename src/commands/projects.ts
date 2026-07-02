import path from 'node:path';
import type { Command } from 'commander';
import { ContextDatabase } from '../database/database.js';
import { loadConfig } from '../services/config.js';

export function registerProjectsCommand(program: Command): void {
  const projects = program.command('project').description('Manage registered projects');

  projects
    .command('add')
    .argument('<name>', 'project name')
    .argument('<root>', 'project root path')
    .description('Register or update a project')
    .action((name: string, root: string) => {
      const config = loadConfig();
      const db = new ContextDatabase(config);

      try {
        const project = db.upsertProject(name, path.resolve(root));
        console.log(`project=${project.name} root=${project.root}`);
      } finally {
        db.close();
      }
    });

  projects
    .command('list')
    .description('List registered projects')
    .action(() => {
      const config = loadConfig();
      const db = new ContextDatabase(config);

      try {
        const allProjects = db.listProjects();

        if (allProjects.length === 0) {
          console.log('projects=0');
          return;
        }

        for (const project of allProjects) {
          console.log(`id=${project.id} name=${project.name} root=${project.root}`);
        }
      } finally {
        db.close();
      }
    });

  projects
    .command('remove')
    .argument('<name>', 'project name')
    .description('Remove a project registration')
    .action((name: string) => {
      const config = loadConfig();
      const db = new ContextDatabase(config);

      try {
        const removed = db.removeProject(name);
        console.log(`removed=${removed}`);
        process.exitCode = removed ? 0 : 1;
      } finally {
        db.close();
      }
    });
}
