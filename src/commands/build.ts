#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { transformDirectory, cleanup } from '../utils/transform-directory';
import ora from 'ora';
import logSymbols from 'log-symbols';

interface TransformOptions {
  outDir: string;
  include: string[];
  exclude: string[];
  clean: boolean;
}

export const build = new Command()
  .name('build')
  .description('Build JSX files to use Handlebars syntax')
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
      const spinner = ora('Transforming files...').start();

      const srcDir = path.resolve(process.cwd(), src);
      const outDir = path.resolve(process.cwd(), options.outDir);

      if (options.clean) {
        cleanup(outDir);
      }

      await transformDirectory(
        {
          srcDir,
          outDir,
          include: options.include,
          exclude: options.exclude,
        },
        (text) => (spinner.text = text)
      );

      spinner.stopAndPersist({
        text: 'Successfully transformed files',
        symbol: logSymbols.success,
      });
    } catch (error) {
      console.error('Error during transformation:', error);
      process.exit(1);
    }
  });
