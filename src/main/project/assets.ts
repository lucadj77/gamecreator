import { readdir } from 'fs/promises'
import { join, relative, sep } from 'path'

/** Elenca ricorsivamente i file sotto assets/, come percorsi relativi con "/" */
export async function listAssets(folder: string): Promise<string[]> {
  const root = join(folder, 'assets')
  const out: string[] = []
  const walk = async (dir: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) await walk(full)
      else out.push(relative(root, full).split(sep).join('/'))
    }
  }
  await walk(root)
  return out.sort()
}
