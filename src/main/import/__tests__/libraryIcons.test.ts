import { readFile } from 'fs/promises'
import { join } from 'path'
import { describe, expect, it, vi } from 'vitest'
import { catalogIndex, findCatalogIcon } from '../ttc'

// i cataloghi veri, letti senza il suffisso ?asset di electron-vite
vi.mock('../../library/catalogs', () => ({
  iconCatalog: async (c: string) =>
    JSON.parse(await readFile(join('resources/catalogs', `${c}.json`), 'utf8'))
}))

describe('icone della libreria di Tabletop Creator', () => {
  it('trova game-icons.net per nome, qualunque sia la categoria', async () => {
    const index = await catalogIndex()
    expect(findCatalogIcon('Shield/shield', index)?.id).toMatch(/\/shield$/)
    expect(findCatalogIcon('Gui/check-mark', index)).toMatchObject({
      collection: 'game-icons',
      id: 'delapouite/check-mark'
    })
  })

  it('trova le Board Game Icons di Kenney', async () => {
    const index = await catalogIndex()
    expect(findCatalogIcon('Board-Kenney/card_flip', index)).toMatchObject({
      collection: 'kenney-icons',
      id: 'icons/card_flip'
    })
  })

  it('lascia le icone che non sono nei cataloghi', async () => {
    const index = await catalogIndex()
    expect(findCatalogIcon('Board-Info-Kenney/players_teams_space', index)).toBeNull()
    expect(findCatalogIcon('TC/Logo', index)).toBeNull()
  })
})
