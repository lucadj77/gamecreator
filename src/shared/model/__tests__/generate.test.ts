import { describe, expect, it } from 'vitest'
import { evaluateFormula } from '../formula'
import {
  addGenerated,
  choices,
  countChoices,
  emptyColumn,
  generateCards,
  parseValues,
  type GeneratorColumn
} from '../generate'

const col = (
  column: string,
  values: string[],
  extra: Partial<GeneratorColumn> = {}
): GeneratorColumn => ({
  ...emptyColumn(column),
  values,
  ...extra
})

const R = ['legno', 'pietra', 'grano', 'oro']

describe('generatore di carte', () => {
  it('conta e elenca combinazioni e disposizioni, con e senza ripetizioni', () => {
    for (const [repeat, ordered, n] of [
      [false, false, 4],
      [true, false, 20],
      [false, true, 24],
      [true, true, 64]
    ] as const) {
      expect(countChoices(4, 3, repeat, ordered)).toBe(n)
      expect(choices(R, 3, repeat, ordered)).toHaveLength(n)
    }
    expect(choices(['a', 'b'], 2, true, false)).toEqual([
      ['a', 'a'],
      ['a', 'b'],
      ['b', 'b']
    ])
  })

  it('4 risorse, 3 icone per carta con ripetizioni: 20 carte in un solo campo', () => {
    const g = generateCards({
      columns: [col('costo', R, { pick: 3, repeat: true })],
      filter: '',
      copies: 1
    })
    expect(g.headers).toEqual(['costo', 'amount'])
    expect(g.rows).toHaveLength(20)
    expect(g.rows[0]).toEqual(['{legno}{legno}{legno}', '1'])
  })

  it('limiti per valore: oro al massimo una volta, legno almeno una', () => {
    const limits = { oro: { max: 1 }, legno: { min: 1 } }
    const list = choices(R, 3, true, false, limits)
    expect(list.every((c) => c.filter((v) => v === 'oro').length <= 1)).toBe(true)
    expect(list.every((c) => c.includes('legno'))).toBe(true)
    expect(countChoices(4, 3, true, false, R, limits)).toBe(list.length)
    // legno almeno 1: 10 multinsiemi; senza quelli con 2 o 3 ori (legno+oro+oro): 9
    expect(list).toHaveLength(9)
  })

  it('6 semi per i numeri 1-5: 30 carte, in due colonne o nello stesso campo', () => {
    const semi = ['spade', 'coppe', 'denari', 'bastoni', 'stelle', 'lune']
    const two = generateCards({
      columns: [col('seme', semi), col('numero', parseValues('1-5'))],
      filter: '',
      copies: 2
    })
    expect(two.rows).toHaveLength(30)
    expect(two.rows[1]).toEqual(['{spade}', '2', '2'])
    const one = generateCards({
      columns: [col('testo', semi), col('testo', parseValues('1..5'))],
      filter: '',
      copies: 1
    })
    expect(one.headers).toEqual(['testo', 'amount'])
    expect(one.rows[0]).toEqual(['{spade} 1', '1'])
  })

  it('il filtro usa le colonne e i singoli valori scelti', () => {
    const g = generateCards({
      columns: [col('costo', R, { pick: 3, repeat: true })],
      filter: 'AND(COUNTIN({costo}; "oro")<2; {costo_1}<>"grano")',
      copies: 1
    })
    expect(g.rows.length).toBeGreaterThan(0)
    expect(g.rows.every((r) => !r[0].startsWith('{grano}'))).toBe(true)
    expect(g.rows.every((r) => r[0].split('{oro}').length - 1 < 2)).toBe(true)
    expect(
      generateCards({ columns: [col('a', R)], filter: '=(', copies: 1 }).filterError
    ).toBeTruthy()
  })

  it('personaggi da una cartella: nomi delle immagini senza graffe', () => {
    const g = generateCards({
      columns: [col('ritratto', ['mago', 'ladra'], { icons: false })],
      filter: '',
      copies: 1
    })
    expect(g.rows).toEqual([
      ['mago', '1'],
      ['ladra', '1']
    ])
  })

  it('nel foglio aggiunge le colonne che mancano o sostituisce le righe', () => {
    const sheet = { name: 's', headers: ['amount', 'nome'], rows: [['1', 'vecchia']] }
    const g = generateCards({ columns: [col('seme', ['a', 'b'])], filter: '', copies: 1 })
    expect(addGenerated(sheet, g, 'append')).toEqual({
      name: 's',
      headers: ['amount', 'nome', 'seme'],
      rows: [
        ['1', 'vecchia', ''],
        ['1', '', '{a}'],
        ['1', '', '{b}']
      ]
    })
    expect(addGenerated(sheet, g, 'replace').rows).toHaveLength(2)
  })

  it('aggiorna solo le colonne generate delle carte presenti e accoda quelle in più', () => {
    const sheet = {
      name: 's',
      headers: ['seme', 'numero', 'amount'],
      rows: [
        ['{a}', '1', '2'],
        ['{b}', '2', '1']
      ]
    }
    const g = generateCards({
      columns: [col('ritratto', ['mago', 'ladra', 'guerriero'], { icons: false })],
      filter: '',
      copies: 1
    })
    expect(addGenerated(sheet, g, 'update')).toEqual({
      name: 's',
      headers: ['seme', 'numero', 'amount', 'ritratto'],
      rows: [
        ['{a}', '1', '2', 'mago'],
        ['{b}', '2', '1', 'ladra'],
        ['', '', '1', 'guerriero']
      ]
    })
    const two = generateCards({ columns: [col('numero', ['9'])], filter: '', copies: 1 })
    expect(addGenerated(sheet, two, 'update').rows).toEqual([
      ['{a}', '9', '2'],
      ['{b}', '2', '1']
    ])
  })

  it('COUNTIN conta le occorrenze', () => {
    expect(evaluateFormula('=COUNTIN("{oro}{oro}{legno}"; "{oro}")', {}).value).toBe('2')
  })
})
