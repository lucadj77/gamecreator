// Messaggi prodotti fuori dal renderer (caricamento, binding): viaggiano come chiave + parametri
// e vengono tradotti nell'interfaccia.

export interface Message {
  key: string
  params?: Record<string, string | number>
}

export const msg = (key: string, params?: Message['params']): Message => ({ key, params })

const PREFIX = 'i18n:'

/** Errore che attraversa l'IPC: Electron conserva solo il testo del messaggio */
export class MessageError extends Error {
  constructor(m: Message) {
    super(PREFIX + JSON.stringify(m))
  }
}

export function messageFromError(e: unknown): Message {
  const text = e instanceof Error ? e.message : String(e)
  const i = text.indexOf(PREFIX)
  if (i >= 0) {
    try {
      return JSON.parse(text.slice(i + PREFIX.length))
    } catch {
      // messaggio non nel formato atteso: lo si mostra così com'è
    }
  }
  return msg('error.generic', { text })
}
