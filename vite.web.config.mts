import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

// Versione web (src/web): la stessa interfaccia dell'app, con window.api fatta nel browser. Il
// codice dei progetti in src/main/project usa fs/promises e path di Node: qui diventano gli
// shims sopra la File System Access API. Vedi docs/web.md.

const shims = resolve('src/web/shims')

export default defineConfig({
  root: 'src/web',
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: [
      { find: '@renderer', replacement: resolve('src/renderer/src') },
      { find: /^(node:)?fs\/promises$/, replacement: resolve(shims, 'fs.ts') },
      { find: /^(node:)?path$/, replacement: resolve(shims, 'path.ts') },
      { find: /^(node:)?zlib$/, replacement: resolve(shims, 'zlib.ts') },
      { find: /^(node:)?url$/, replacement: resolve(shims, 'url.ts') }
    ]
  },
  plugins: [react()],
  build: {
    outDir: resolve('out/web'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000
  }
})
