import { mkdir } from 'fs/promises'
import { join } from 'path'

/**
 * Percorso libero in deleted/ dentro il progetto per ciò che si elimina: nome, data e ora, così
 * eliminazioni successive non si sovrascrivono. Crea la cartella se manca.
 */
export async function deletedPath(folder: string, base: string, ext: string): Promise<string> {
  const dir = join(folder, 'deleted')
  await mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  // i nomi dei fogli possono avere caratteri che Windows non accetta nei file
  return join(dir, `${base.replace(/[<>:"/\\|?*]/g, '_')} ${stamp}${ext}`)
}
