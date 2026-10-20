import { access } from 'fs/promises'

/** Il file o la cartella esiste */
export async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
