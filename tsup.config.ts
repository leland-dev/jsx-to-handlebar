// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'], // Your main entry file
  format: ['cjs', 'esm'], // Or just 'esm' if that's your target
  dts: true, // Generate d.ts files
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'ora', // Mark ora as external
    'esbuild',
    // Add any other packages that cause similar ERR_REQUIRE_ESM errors
    // For example, if you find issues with 'chalk', add 'chalk' here
  ],
});
