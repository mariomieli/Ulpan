import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/** Scrive nel service worker l'elenco dei file della build: l'app funziona offline già dalla prima visita. */
function precache(): Plugin {
  let files: string[] = [];
  let outDir = 'dist';
  return {
    name: 'ulpan-precache',
    apply: 'build',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    generateBundle(_, bundle) {
      files = Object.keys(bundle).filter((f) => f.startsWith('assets/') && !f.endsWith('.map'));
    },
    closeBundle() {
      const sw = resolve(outDir, 'sw.js');
      const version = Date.now().toString(36);
      writeFileSync(sw, readFileSync(sw, 'utf8')
        .replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(files.map((f) => `./${f}`))};`)
        .replace("const CACHE = 'ulpan-v3';", `const CACHE = 'ulpan-v3-${version}';`));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), precache()],
  build: { chunkSizeWarningLimit: 700 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
