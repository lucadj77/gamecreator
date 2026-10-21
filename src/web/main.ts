// Avvio della versione web: prima window.api, poi la stessa interfaccia dell'app desktop
import './polyfills'
import { webApi } from './api'
import { exportPageApi } from './exportFrame'
import { loadRoots } from './fs/roots'
import { showUnsupported } from './unsupported'

async function start(): Promise<void> {
  // la pagina delle esportazioni (iframe) usa i file del progetto aperto nella pagina principale
  const page = exportPageApi()
  if (page) {
    const host = window.parent as Window & { api: typeof webApi }
    window.api = { ...host.api, exportPage: page }
  } else {
    if (!('showDirectoryPicker' in window)) return showUnsupported()
    await loadRoots()
    window.api = webApi
  }
  await import('../renderer/src/main')
}

start()
