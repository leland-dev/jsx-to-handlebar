#!/usr/bin/env node
import { Command } from 'commander';
import packageJson from '../package.json';
import { build } from './commands/build';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
  const program = new Command()
    .name('jsx-to-handlebars')
    .description('Transform JSX templates to use Handlebars syntax')
    .version(
      packageJson.version || '1.0.0',
      '-v, --version',
      'display the version number'
    );

  program.addCommand(build);

  program.parse(process.argv);
}

main();
