import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n'
import { loadTheme, setTheme } from './theme/theme'
import ExportPage from './export/ExportPage'

const root = createRoot(document.getElementById('root')!)

if (location.hash === '#export') {
  // finestra nascosta delle esportazioni: senza StrictMode, che registrerebbe due volte gli ascolti
  root.render(
    <I18nProvider>
      <ExportPage />
    </I18nProvider>
  )
} else {
  // prima del primo disegno, così la finestra non si apre con il tema sbagliato
  setTheme(loadTheme())
  root.render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>
  )
}
