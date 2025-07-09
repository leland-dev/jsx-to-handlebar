#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { transformDirectoryEmail } from '../utils/transform-directory-email';
import ora from 'ora';
import logSymbols from 'log-symbols';

interface TransformEmailOptions {
  outDir: string;
  include: string[];
  exclude: string[];
  clean: boolean;
}

export const buildEmail = new Command()
  .name('build-email')
  .description(
    'Build JSX files to HTML using Handlebars syntax and React Email render'
  )
  .argument(
    '[src]',
    'Source directory containing JSX/TSX files',
    './src/emails'
  )
  .option(
    '-o, --out-dir <dir>',
    'Output directory for rendered HTML files',
    'temp'
  )
  .option('-i, --include <patterns...>', 'File patterns to include', [
    '**/*.tsx',
  ])
  .option('-e, --exclude <patterns...>', 'File patterns to exclude', [
    'node_modules/**',
  ])
  .option('--clean', 'Clean output directory before transforming', false)
  .action(async (src: string, options: TransformEmailOptions) => {
    try {
      const spinner = ora('Building email templates...').start();

      const srcDir = path.resolve(process.cwd(), src);
      const outDir = path.resolve(process.cwd(), options.outDir);

      if (options.clean) {
        // Clean output directory if it exists
        if (require('fs').existsSync(outDir)) {
          require('fs').rmSync(outDir, { recursive: true, force: true });
        }
      }

      await transformDirectoryEmail(
        {
          srcDir,
          outDir,
          include: options.include,
          exclude: options.exclude,
        },
        (text: string) => (spinner.text = text),
        (text: string) =>
          spinner?.stopAndPersist({
            symbol: logSymbols.error,
            text,
          })
      );

      spinner.stopAndPersist({
        text: 'Successfully built email templates',
        symbol: logSymbols.success,
      });
    } catch (error) {
      console.error('Error during email build:', error);
      process.exit(1);
    }
  });
