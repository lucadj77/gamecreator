// Tipi dei file che il browser sa mostrare in una scheda. Gli altri (Word, archivi...) si potrebbero
// solo scaricare di nuovo: sono già nella cartella del progetto, e un'altra copia in Download confonde.

const VIEWABLE: Record<string, string> = {
  html: 'text/html',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  md: 'text/plain;charset=utf-8',
  txt: 'text/plain;charset=utf-8',
  json: 'application/json'
}

/** Tipo MIME con cui il browser mostra il file, o undefined se il browser lo scaricherebbe */
export function browserViewable(path: string): string | undefined {
  const name = path.split(/[\\/]/).pop() ?? ''
  const ext = name.includes('.') ? (name.split('.').pop() ?? '').toLowerCase() : ''
  return ext ? VIEWABLE[ext] : undefined
}
