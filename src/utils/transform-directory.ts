import { transformFileAsync, transformFileSync } from '@babel/core';
import fs from 'fs';
import path from 'path';
import plugin from '../plugin/index';
import { minimatch } from 'minimatch';

interface BuildOptions {
  srcDir: string;
  outDir: string;
  include?: string[];
  exclude?: string[];
}

export async function transformDirectory(
  options: BuildOptions,
  outputProgress: (text: string) => void
): Promise<void> {
  const {
    srcDir,
    outDir,
    include = ['**/*.tsx'],
    exclude = ['node_modules/**'],
  } = options;

  // Ensure output directory exists
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Process all files in the source directory
  await processDirectory(srcDir, outDir, include, exclude, outputProgress);
}

async function processDirectory(
  srcDir: string,
  outDir: string,
  include: string[],
  exclude: string[],
  outputProgress: (text: string) => void
): Promise<void> {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const outPath = path.join(outDir, entry.name);

    if (entry.isDirectory()) {
      // Skip excluded directories
      if (exclude.some((pattern) => srcPath.includes(pattern))) {
        continue;
      }
      // Recursively process subdirectories
      fs.mkdirSync(outPath, { recursive: true });
      await processDirectory(
        srcPath,
        outPath,
        include,
        exclude,
        outputProgress
      );
    } else if (entry.isFile()) {
      // Check if file matches any include pattern
      if (!include.some((pattern) => minimatch(entry.name, pattern))) {
        continue;
      }

      try {
        outputProgress(`Transforming ${entry.name}`);
        // Transform the file
        const result = await transformFileAsync(srcPath, {
          plugins: [plugin],
          parserOpts: {
            plugins: ['jsx', 'typescript'],
          },
          filename: entry.name,
        });

        if (result?.code) {
          fs.writeFileSync(outPath, result.code);
        }
      } catch (error) {
        console.error(`Error transforming file ${srcPath}:`, error);
      }
    }
  }
}

// Cleanup function to remove temporary directory
export function cleanup(directory: string): void {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
