import { DATA_ROOT } from '../fs/roots'

// Le parti di Electron che usa il codice delle librerie e dei backup (src/main): i dati dell'app
// stanno nello spazio privato del sito nel browser, le richieste di rete sono fetch.

export const app = {
  getPath(name: string): string {
    return name === 'userData' ? DATA_ROOT : `${DATA_ROOT}/${name}`
  }
}

export const net = {
  /** Il browser non lascia cambiare lo user agent: l'intestazione si toglie */
  fetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers)
    headers.delete('User-Agent')
    return fetch(url, { ...init, headers })
  }
}
