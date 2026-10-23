import { readFileSync, rmSync } from 'fs'
import { readFile, rm, writeFile } from 'fs/promises'
import { hostname } from 'os'
import { join } from 'path'
import type { AgentLock } from '../../shared/api'

// Un'IA e l'app non lavorano insieme sullo stesso progetto. L'app scrive nella cartella del
// progetto se ha modifiche non salvate (.stella-app); `stella begin` rifiuta di partire se ne ha,
// altrimenti scrive .stella-ai e l'app si blocca finché `stella end` non lo cancella, poi ricarica.
// I file che iniziano con il punto restano fuori dai backup.

export const APP_STATE_FILE = '.stella-app'
export const AGENT_LOCK_FILE = '.stella-ai'

export interface AppState {
  pid: number
  dirty: boolean
  /** Computer su cui gira l'app: da un altro il processo non si può controllare */
  host?: string
  /** Quando lo stato è stato scritto l'ultima volta (ms); l'app lo riscrive a intervalli */
  at?: number
}

/** Ogni quanto l'app riscrive il suo stato */
export const APP_STATE_HEARTBEAT = 30 * 1000
/** Uno stato scritto da un altro computer vale finché è più recente di questo */
const APP_STATE_MAX_AGE = 5 * 60 * 1000

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
  if (!state || typeof state.pid !== 'number') return null
  // un'app chiusa male lascia il file: conta solo se il processo c'è ancora; da un altro
  // computer (progetto su un disco condiviso) conta solo se il file è recente
  if (state.host && state.host !== hostname())
    return typeof state.at === 'number' && Date.now() - state.at < APP_STATE_MAX_AGE ? state : null
  return alive(state.pid) ? state : null
}

export async function writeAppState(folder: string, dirty: boolean): Promise<void> {
  const state: AppState = { pid: process.pid, dirty, host: hostname(), at: Date.now() }
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
