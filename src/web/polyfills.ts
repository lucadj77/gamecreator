import { Buffer } from 'buffer'

// Buffer di Node, usato dal codice dei progetti (font, fogli di calcolo, esportazione)
const g = globalThis as unknown as { Buffer?: typeof Buffer }
g.Buffer ??= Buffer
