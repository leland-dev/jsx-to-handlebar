#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { transformDirectory, cleanup } from './build';

interface TransformOptions {
  outDir: string;
  include: string[];
  exclude: string[];
  clean: boolean;
}

const program = new Command();

program
  .name('jsx-to-handlebars')
  .description('Transform JSX templates to use Handlebars syntax')
  .version('0.1.0');

program
  .command('transform')
  .description('Transform JSX files to use Handlebars syntax')
  .argument(
    '[src]',
    'Source directory containing JSX/TSX files',
    './src/emails'
  )
  .option(
    '-o, --out-dir <dir>',
    'Output directory for transformed files',
    'temp'
  )
  .option('-i, --include <patterns...>', 'File patterns to include', [
    '**/*.tsx',
  ])
  .option('-e, --exclude <patterns...>', 'File patterns to exclude', [
    'node_modules/**',
  ])
  .option('--clean', 'Clean output directory before transforming', false)
  .action(async (src: string, options: TransformOptions) => {
    try {
      const srcDir = path.resolve(process.cwd(), src);
      const outDir = path.resolve(process.cwd(), options.outDir);

      if (options.clean) {
        cleanup(outDir);
      }

      await transformDirectory({
        srcDir,
        outDir,
        include: options.include,
        exclude: options.exclude,
      });

      console.log('Transformation completed successfully!');
    } catch (error) {
      console.error('Error during transformation:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
