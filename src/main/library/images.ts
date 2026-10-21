import { copyFile, mkdir } from 'fs/promises'
import { basename, extname, join } from 'path'
import { IMAGES_FOLDER } from '../../shared/library'
import { exists } from '../fs'

// Immagini scelte dal computer, copiate in assets/images/ del progetto. Un file con lo stesso
// nome non si sovrascrive: la copia prende un numero, come "mappa 2.png".

/** Percorso libero in dir per il file name */
export async function freeName(dir: string, name: string): Promise<string> {
  const ext = extname(name)
  const base = basename(name, ext)
  let target = join(dir, name)
  for (let n = 2; await exists(target); n++) target = join(dir, `${base} ${n}${ext}`)
  return target
}

export async function copyImages(folder: string, files: string[]): Promise<void> {
  const dir = join(folder, 'assets', IMAGES_FOLDER)
  await mkdir(dir, { recursive: true })
  for (const f of files) await copyFile(f, await freeName(dir, basename(f)))
}
