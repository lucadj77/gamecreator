import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  AGENT_LOCK_FILE,
  APP_STATE_FILE,
  beginAgent,
  clearAppState,
  endAgent,
  readAgentLock,
  readAppState,
  UnsavedChangesError,
  writeAppState
} from '../agentLock'

let folder: string

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'naibi-lock-'))
})

afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

describe('blocco per gli agenti IA', () => {
  it('senza app aperta begin e end scrivono e tolgono il blocco', async () => {
    expect(await readAppState(folder)).toBeNull()
    await beginAgent(folder, 'nuove carte')
    expect(await readAgentLock(folder)).toMatchObject({ note: 'nuove carte' })
    await endAgent(folder)
    expect(await readAgentLock(folder)).toBeNull()
  })

  it("begin rifiuta se l'app ha modifiche non salvate", async () => {
    await writeAppState(folder, true)
    await expect(beginAgent(folder)).rejects.toBeInstanceOf(UnsavedChangesError)
    expect(await readAgentLock(folder)).toBeNull()
    await writeAppState(folder, false)
    await beginAgent(folder)
    expect(await readAgentLock(folder)).not.toBeNull()
  })

  it("lo stato di un'app che non c'è più non conta", async () => {
    // un pid che non esiste: l'app si è chiusa senza togliere il file
    await writeFile(join(folder, APP_STATE_FILE), JSON.stringify({ pid: 2 ** 22 + 7, dirty: true }))
    expect(await readAppState(folder)).toBeNull()
    await beginAgent(folder)
  })

  it('lo stato scritto da un altro computer conta solo se recente', async () => {
    const other = { pid: process.pid, dirty: true, host: 'altro-mac' }
    await writeFile(join(folder, APP_STATE_FILE), JSON.stringify({ ...other, at: Date.now() }))
    expect(await readAppState(folder)).toMatchObject({ dirty: true })
    await writeFile(
      join(folder, APP_STATE_FILE),
      JSON.stringify({ ...other, at: Date.now() - 10 * 60 * 1000 })
    )
    expect(await readAppState(folder)).toBeNull()
  })

  it("l'app toglie solo il proprio stato", async () => {
    await writeFile(
      join(folder, APP_STATE_FILE),
      JSON.stringify({ pid: process.pid + 1, dirty: false })
    )
    clearAppState(folder)
    expect(await readFile(join(folder, APP_STATE_FILE), 'utf8')).toContain('dirty')
    await writeAppState(folder, false)
    clearAppState(folder)
    await expect(readFile(join(folder, APP_STATE_FILE))).rejects.toThrow()
  })

  it('un blocco illeggibile vale come nessun blocco', async () => {
    await writeFile(join(folder, AGENT_LOCK_FILE), 'xx')
    expect(await readAgentLock(folder)).toBeNull()
  })
})
