import { watch, type FSWatcher } from 'fs'
import { stat } from 'fs/promises'
import { basename, dirname } from 'path'

// Il file dati del progetto aperto, sorvegliato per accorgersi quando cambia fuori da Stella
// (Excel, LibreOffice, il comando stella). Si guarda la cartella e non il file, perché i
// programmi di solito salvano scrivendo un file nuovo e rinominandolo. Le scritture di Stella
// stesso non contano: dopo ognuna si aggiorna l'impronta (markDataWritten).

const DEBOUNCE_MS = 1000

let current: { path: string; watcher: FSWatcher; sig: string; timer?: NodeJS.Timeout } | null = null

/** Data di modifica e dimensione: cambiano a ogni salvataggio */
async function signature(path: string): Promise<string> {
  try {
    const s = await stat(path)
    return `${s.mtimeMs}:${s.size}`
  } catch {
    return ''
  }
}

export async function watchDataFile(path: string, onChange: () => void): Promise<void> {
  stopWatchingData()
  const sig = await signature(path)
  let watcher: FSWatcher
  try {
    watcher = watch(dirname(path), (_, name) => {
      if (!current || (name && name.toString() !== basename(path))) return
      clearTimeout(current.timer)
      const state = current
      // i salvataggi arrivano a raffiche di eventi: si aspetta che finiscano
      state.timer = setTimeout(async () => {
        const now = await signature(path)
        if (current !== state || !now || now === state.sig) return
        state.sig = now
        onChange()
      }, DEBOUNCE_MS)
    })
  } catch {
    // cartella dei dati assente (progetto senza ancora un set): niente da sorvegliare
    return
  }
  watcher.on('error', () => stopWatchingData())
  current = { path, watcher, sig }
}

/** Dopo una scrittura di Stella: il file com'è adesso non è un cambiamento esterno */
export async function markDataWritten(): Promise<void> {
  if (current) current.sig = await signature(current.path)
}

export function stopWatchingData(): void {
  if (!current) return
  clearTimeout(current.timer)
  current.watcher.close()
  current = null
}
