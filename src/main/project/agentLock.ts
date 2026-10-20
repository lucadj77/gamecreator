import { readFileSync, rmSync } from 'fs'
import { readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import type { AgentLock } from '../../shared/api'

// Un'IA e l'app non lavorano insieme sullo stesso progetto. L'app scrive nella cartella del
// progetto se ha modifiche non salvate (.naibi-app); `naibi begin` rifiuta di partire se ne ha,
// altrimenti scrive .naibi-ai e l'app si blocca finché `naibi end` non lo cancella, poi ricarica.
// I file che iniziano con il punto restano fuori dai backup.

export const APP_STATE_FILE = '.naibi-app'
export const AGENT_LOCK_FILE = '.naibi-ai'

export interface AppState {
  pid: number
  dirty: boolean
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    // EPERM: il processo esiste ma è di un altro utente
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as T
  } catch {
    return null
  }
}

/** Stato dell'app che ha aperto il progetto; null se nessuna app aperta lo ha */
export async function readAppState(folder: string): Promise<AppState | null> {
  const state = await readJson<AppState>(join(folder, APP_STATE_FILE))
  // un'app chiusa male lascia il file: conta solo se il processo c'è ancora
  return state && typeof state.pid === 'number' && alive(state.pid) ? state : null
}

export async function writeAppState(folder: string, dirty: boolean): Promise<void> {
  const state: AppState = { pid: process.pid, dirty }
  await writeFile(join(folder, APP_STATE_FILE), JSON.stringify(state) + '\n')
}

/** Toglie lo stato solo se è di questa app: un'altra finestra potrebbe avere lo stesso progetto */
export function clearAppState(folder: string): void {
  const file = join(folder, APP_STATE_FILE)
  try {
    const state = JSON.parse(readFileSync(file, 'utf8')) as AppState
    if (state.pid === process.pid) rmSync(file, { force: true })
  } catch {
    // niente da togliere
  }
}

export async function readAgentLock(folder: string): Promise<AgentLock | null> {
  const lock = await readJson<AgentLock>(join(folder, AGENT_LOCK_FILE))
  return lock && typeof lock.since === 'string' ? lock : null
}

export class UnsavedChangesError extends Error {}

/** Inizio del lavoro di un'IA: rifiuta se l'app ha modifiche non salvate */
export async function beginAgent(folder: string, note?: string): Promise<AgentLock> {
  const app = await readAppState(folder)
  if (app?.dirty) throw new UnsavedChangesError()
  const lock: AgentLock = { since: new Date().toISOString(), ...(note ? { note } : {}) }
  await writeFile(join(folder, AGENT_LOCK_FILE), JSON.stringify(lock) + '\n')
  return lock
}

export async function endAgent(folder: string): Promise<void> {
  await rm(join(folder, AGENT_LOCK_FILE), { force: true })
}
