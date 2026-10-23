import { mkdtemp, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { markDataWritten, stopWatchingData, watchDataFile } from '../watchData'

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

describe('watchDataFile', () => {
  afterEach(() => stopWatchingData())

  it('segnala le scritture fatte da altri, non quelle di Stella né gli altri file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gc-'))
    const path = join(dir, 'cards.xlsx')
    await writeFile(path, 'a')
    let changes = 0
    await watchDataFile(path, () => changes++)

    await writeFile(join(dir, '~$cards.xlsx'), 'lock')
    await wait(1500)
    expect(changes).toBe(0)

    await writeFile(path, 'bb')
    await markDataWritten()
    await wait(1500)
    expect(changes).toBe(0)

    await writeFile(path, 'ccc')
    await wait(1500)
    expect(changes).toBe(1)
  }, 10000)
})
