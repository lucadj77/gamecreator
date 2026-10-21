import { Buffer } from 'buffer'
import { unzlibSync } from 'fflate'

// zlib di Node nella versione web: serve solo a leggere nome e peso dei font WOFF. Il brotli dei
// WOFF2 non c'è: chi lo usa (project/fonts.ts) ricava allora i dati dal nome del file.

export function inflateSync(data: Uint8Array): Buffer {
  return Buffer.from(unzlibSync(data))
}

export function brotliDecompressSync(): Buffer {
  throw new Error('brotli is not available in the browser')
}
