import { transformFileAsync } from '@babel/core';
import plugin from '../../../plugin';
import { Loader, Plugin } from 'esbuild';
import path from 'path';

export const babelPlugin: Plugin = {
  name: 'babel',
  setup(build) {
    build.onLoad({ filter: /\.(jsx|tsx)$/ }, async (args) => {
      const result = await transformFileAsync(args.path, {
        plugins: [plugin],
        parserOpts: {
          plugins: ['jsx', 'typescript'],
        },
      });
      return {
        contents: result?.code || '',
        loader: path.extname(args.path).slice(1) as Loader,
      };
    });
  },
};
