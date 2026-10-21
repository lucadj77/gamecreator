// Attese della finestra di esportazione misurate sul silenzio, non sulla durata totale: un foglio
// di Tabletop Simulator con decine di carte e immagini grandi può impiegare minuti, e va bene
// finché qualcosa si muove. Si ferma con un errore solo quando non succede più niente.

export interface Pending {
  /** Cosa si sta aspettando, per il messaggio d'errore */
  label: string
  promise: Promise<unknown>
}

/**
 * Aspetta tutte le promesse. Ogni volta che una finisce chiama onProgress; se per idleMs non ne
 * finisce nessuna, rifiuta con l'elenco di quelle ancora in sospeso.
 */
export function waitForAll(
  items: Pending[],
  idleMs: number,
  onProgress?: () => void
): Promise<void> {
  if (!items.length) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const pending = new Set(items)
    let timer: ReturnType<typeof setTimeout>
    const arm = (): void => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const names = [...pending].map((p) => p.label)
        const shown =
          names.slice(0, 5).join(', ') + (names.length > 5 ? ` (+${names.length - 5})` : '')
        reject(new Error(`still waiting after ${Math.round(idleMs / 1000)} s for: ${shown}`))
      }, idleMs)
    }
    arm()
    for (const item of items) {
      const done = (): void => {
        if (!pending.delete(item)) return
        onProgress?.()
        if (pending.size) arm()
        else {
          clearTimeout(timer)
          resolve()
        }
      }
      item.promise.then(done, done)
    }
  })
}

/** La promessa, oppure un errore con il messaggio dato se non finisce entro ms */
export function within<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

/**
 * Sveglia che scatta dopo ms di silenzio: alive() la fa ripartire. Serve al processo principale
 * per accorgersi di una pagina di esportazione bloccata senza fermare un lavoro lungo ma vivo.
 */
export class Watchdog {
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private ms: number,
    private onTimeout: () => void
  ) {
    this.alive()
  }

  alive(): void {
    this.stop()
    this.timer = setTimeout(() => {
      this.timer = null
      this.onTimeout()
    }, this.ms)
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }
}
