import fs from 'fs';
import path from 'path';
import { minimatch } from 'minimatch';
import { renderEmail } from './render/render-email';

interface BuildEmailOptions {
  srcDir: string;
  outDir: string;
  include?: string[];
  exclude?: string[];
}

export async function transformDirectoryEmail(
  options: BuildEmailOptions,
  outputProgress: (text: string) => void,
  outputError: (text: string) => void
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
  await processDirectoryEmail(
    srcDir,
    outDir,
    include,
    exclude,
    outputProgress,
    outputError
  );
}

async function processDirectoryEmail(
  srcDir: string,
  outDir: string,
  include: string[],
  exclude: string[],
  outputProgress: (text: string) => void,
  outputError: (text: string) => void
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
      await processDirectoryEmail(
        srcPath,
        outPath,
        include,
        exclude,
        outputProgress,
        outputError
      );
    } else if (entry.isFile()) {
      // Check if file matches any include pattern
      if (!include.some((pattern) => minimatch(entry.name, pattern))) {
        continue;
      }

      try {
        outputProgress(`Transforming and rendering ${entry.name}`);

        // Try to render the transformed component
        try {
          const result = await renderEmail(srcPath);
          if ('error' in result) {
            outputError(result.error);
            continue;
          }
          const { result: markup } = result;

          // Write the HTML file with .html extension
          const htmlFileName = entry.name.replace(
            /\.(tsx|ts|jsx|js)$/,
            '.html'
          );
          const htmlPath = path.join(outDir, htmlFileName);
          fs.writeFileSync(htmlPath, markup);
        } catch (renderError) {
          outputError(`Error rendering ${entry.name}: ${String(renderError)}`);
        }
      } catch (error) {
        outputError(`Error transforming file ${srcPath}: ${String(error)}`);
      }
    }
  }
}
