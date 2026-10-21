// url di Node nella versione web: i file non hanno un indirizzo file:// vero

export function pathToFileURL(path: string): URL {
  return new URL('file://' + path.split('/').map(encodeURIComponent).join('/'))
}

export function fileURLToPath(url: string | URL): string {
  return decodeURIComponent(new URL(url).pathname)
}
