import type { Theme } from '../../../shared/api'

const THEME_KEY = 'theme'
export const THEMES: Theme[] = ['system', 'light', 'dark']

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY) as Theme | null
    return t && THEMES.includes(t) ? t : 'system'
  } catch {
    return 'system'
  }
}

/** Imposta il tema senza ricordarlo: all'avvio e quando cambia */
export function setTheme(theme: Theme): void {
  // l'attributo decide i colori dell'app; il tema nativo quelli di menu e controlli di sistema
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
  window.api.setTheme(theme)
}

export function applyTheme(theme: Theme): void {
  setTheme(theme)
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // preferenza non essenziale
  }
}
