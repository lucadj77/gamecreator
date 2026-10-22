import { describe, expect, it } from 'vitest'
import type { LoadedProject, Sheet } from '../../project'
import { changesData } from '../readOnlyData'

const sheet = (name: string): Sheet => ({ name, headers: ['name'], rows: [['a']] })
const project = (sets: LoadedProject['sets'], unusedData: Sheet[] = []): LoadedProject => ({
  folder: '/p',
  file: { formatVersion: 1, name: 'p', dataFile: 'data/cards.xlsx', sets: [] },
  sets,
  unusedSheets: unusedData.map((s) => s.name),
  unusedData,
  templates: [],
  assets: [],
  fonts: [],
  sources: {},
  notes: [],
  warnings: []
})

describe('changesData', () => {
  const troops = sheet('Troops')
  const prev = project([{ name: 'Red', template: 'red', data: troops }], [sheet('Spare')])

  it('accepts sets that keep, share or link sheets already in the file', () => {
    const next = project([
      { name: 'Red', template: 'red', data: troops },
      { name: 'Yellow', template: 'yellow', data: troops },
      { name: 'Spare', template: 'red', data: prev.unusedData[0] }
    ])
    expect(changesData(prev, next)).toBe(false)
  })

  it('rejects edited rows and new sheets', () => {
    const edited = project([{ name: 'Red', template: 'red', data: { ...troops, rows: [['b']] } }])
    expect(changesData(prev, edited)).toBe(true)
    const added = project([...prev.sets, { name: 'New', template: 'red', data: sheet('New') }])
    expect(changesData(prev, added)).toBe(true)
  })
})
