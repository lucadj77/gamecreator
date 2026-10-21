// Il modulo path di Node nella versione web: percorsi in stile POSIX, sempre con "/". I percorsi
// dei progetti sono virtuali (/<cartella scelta>/...), vedi fs/roots.ts.

export const sep = '/'
export const delimiter = ':'

export function normalize(path: string): string {
  const absolute = path.startsWith('/')
  const out: string[] = []
  for (const part of path.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop()
      else if (!absolute) out.push('..')
    } else out.push(part)
  }
  const body = out.join('/')
  return absolute ? '/' + body : body || '.'
}

export function join(...parts: string[]): string {
  const joined = parts.filter((p) => p).join('/')
  return joined ? normalize(joined) : '.'
}

export function isAbsolute(path: string): boolean {
  return path.startsWith('/')
}

export function resolve(...parts: string[]): string {
  let path = ''
  for (let i = parts.length - 1; i >= 0 && !path.startsWith('/'); i--)
    if (parts[i]) path = path ? `${parts[i]}/${path}` : parts[i]
  return normalize(path.startsWith('/') ? path : '/' + path)
}

export function dirname(path: string): string {
  const p = path.replace(/\/+$/, '')
  const i = p.lastIndexOf('/')
  if (i < 0) return '.'
  return i === 0 ? '/' : p.slice(0, i)
}

export function basename(path: string, ext?: string): string {
  const name = path.replace(/\/+$/, '').split('/').pop() ?? ''
  return ext && name.endsWith(ext) && name !== ext ? name.slice(0, -ext.length) : name
}

export function extname(path: string): string {
  const name = basename(path)
  const i = name.lastIndexOf('.')
  return i <= 0 ? '' : name.slice(i)
}

export function relative(from: string, to: string): string {
  const a = resolve(from).split('/').filter(Boolean)
  const b = resolve(to).split('/').filter(Boolean)
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/')
}

export const posix = {
  sep,
  delimiter,
  normalize,
  join,
  isAbsolute,
  resolve,
  dirname,
  basename,
  extname,
  relative
}

export default posix
