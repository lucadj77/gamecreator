import { describe, expect, it } from 'vitest'
import type { LoadedSet, ProjectFile, Sheet } from '../../project'
import { renameSet } from '../renameSet'

const sheet = (name: string): Sheet => ({ name, headers: ['amount', 'nome'], rows: [['1', 'Uno']] })

function project(): { file: ProjectFile; sets: LoadedSet[] } {
  const defs = [
    { name: 'Eroi', template: 'carta', hiddenColumns: ['note'] },
    { name: 'Mostri', template: 'carta', sheet: 'Foglio2' }
  ]
  return {
    file: {
      formatVersion: 1,
      name: 'Gioco',
      dataFile: 'dati.xlsx',
      sets: defs,
      export: {
        pdf: { sets: ['Eroi', 'Mostri'] },
        tts: { objects: { Eroi: { type: 'token', thickness: 0.2, edgeColor: '#FFFFFF' } } },
        named: [{ name: 'Stampa', kind: 'images', options: { sets: ['Eroi'] } }]
      }
    },
    sets: [
      { ...defs[0], data: sheet('Eroi') },
      { ...defs[1], data: sheet('Foglio2') }
    ]
  }
}

describe('renameSet', () => {
  it('rinomina set, foglio e profili di esportazione', () => {
    const p = project()
    const out = renameSet(p.file, p.sets, 0, 'Personaggi', false)
    expect(out.file.sets[0]).toEqual({
      name: 'Personaggi',
      template: 'carta',
      hiddenColumns: ['note']
    })
    expect(out.sets[0].data).toMatchObject({ name: 'Personaggi', origin: 'Eroi' })
    expect(out.file.export?.pdf?.sets).toEqual(['Personaggi', 'Mostri'])
    expect(out.file.export?.named?.[0].options.sets).toEqual(['Personaggi'])
    expect(Object.keys(out.file.export?.tts?.objects ?? {})).toEqual(['Personaggi'])
    // l'originale non cambia
    expect(p.sets[0].data?.name).toBe('Eroi')
  })

  it('due rinomine prima di salvare partono dal foglio sul disco; tornare al nome toglie la rinomina', () => {
    const p = project()
    const a = renameSet(p.file, p.sets, 0, 'A', false)
    const b = renameSet(a.file, a.sets, 0, 'B', false)
    expect(b.sets[0].data).toMatchObject({ name: 'B', origin: 'Eroi' })
    const c = renameSet(b.file, b.sets, 0, 'Eroi', false)
    expect(c.sets[0].data).toEqual(sheet('Eroi'))
  })

  it('un foglio con un nome suo, o un file csv, resta com’è', () => {
    const p = project()
    const out = renameSet(p.file, p.sets, 1, 'Nemici', false)
    expect(out.file.sets[1]).toEqual({ name: 'Nemici', template: 'carta', sheet: 'Foglio2' })
    expect(out.sets[1].data).toEqual(sheet('Foglio2'))
    const csv = renameSet(p.file, p.sets, 0, 'Personaggi', true)
    expect(csv.file.sets[0].sheet).toBe('Eroi')
    expect(csv.sets[0]).toMatchObject({ name: 'Personaggi', sheet: 'Eroi', data: sheet('Eroi') })
  })

  it('con keepSheet il foglio tiene il suo nome', () => {
    const p = project()
    const out = renameSet(p.file, p.sets, 0, 'Personaggi', false, true)
    expect(out.file.sets[0]).toMatchObject({ name: 'Personaggi', sheet: 'Eroi' })
    expect(out.sets[0].data).toEqual(sheet('Eroi'))
  })
})
