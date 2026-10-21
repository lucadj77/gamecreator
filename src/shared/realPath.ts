// Solo nella versione web: il browser non dice il percorso vero di una cartella scelta, che però
// serve a Tabletop Simulator per trovare le immagini del mazzo. L'utente lo scrive una volta per
// ogni cartella, e il sito lo ricorda in questo browser.

const KEY = 'naibi.realPath:'

/** Cartella scelta a cui appartiene un percorso virtuale: /<nome> */
export function virtualRoot(path: string): string {
  return '/' + (path.split('/').filter(Boolean)[0] ?? '')
}

export function readRealPath(path: string): string {
  try {
    return localStorage.getItem(KEY + virtualRoot(path)) ?? ''
  } catch {
    return ''
  }
}

export function writeRealPath(path: string, real: string): void {
  try {
    const key = KEY + virtualRoot(path)
    if (real.trim()) localStorage.setItem(key, real.trim())
    else localStorage.removeItem(key)
  } catch {
    // senza il percorso salvato lo si riscrive la prossima volta
  }
}

const WINDOWS = /^([a-z]:[\\/]|\\\\)/i

/**
 * Percorso vero di un file sotto una cartella scelta, dal percorso vero della cartella. Con una
 * lettera di unità (C:\) o un percorso di rete (\\server) è un percorso di Windows.
 */
export function toRealPath(file: string, real: string): { path: string; platform: string } {
  const rest = file.split('/').filter(Boolean).slice(1)
  if (WINDOWS.test(real)) {
    const base = real.replace(/[\\/]+$/, '')
    return { path: [base, ...rest].join('\\'), platform: 'win32' }
  }
  const base = real.replace(/\/+$/, '')
  return { path: [base, ...rest].join('/'), platform: 'darwin' }
}

/**
 * Il percorso scritto finisce con il nome della cartella scelta (a cui il sito può aver aggiunto
 * un numero, come "Saved Objects (2)")
 */
export function realPathMatches(path: string, real: string): boolean {
  const name = virtualRoot(path).slice(1)
  const last =
    real
      .replace(/[\\/]+$/, '')
      .split(/[\\/]/)
      .pop() ?? ''
  return name === last || name.startsWith(last + ' (') || name === last.replace(/^\./, '_')
}
