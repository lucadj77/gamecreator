import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { I18nProvider } from './i18n'
import { loadTheme, setTheme } from './theme/theme'

// prima del primo disegno, così la finestra non si apre con il tema sbagliato
setTheme(loadTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
)
