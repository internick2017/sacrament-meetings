import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    // next-auth (beta) imports "next/server" without an extension, which
    // Next 16's ESM package resolution no longer accepts. Next's own build
    // tolerates it; vitest's stricter Node ESM resolution does not. Point
    // it at the real file so lib/auth.ts (and anything importing it) can
    // load under vitest.
    alias: [{ find: 'next/server', replacement: 'next/server.js' }],
    // Vite hands node_modules packages to Node's native resolver by default,
    // which skips the alias above. Force next-auth through Vite's own
    // resolution so the alias actually applies.
    server: {
      deps: {
        inline: ['next-auth'],
      },
    },
  },
});
