import { describe, expect, it } from 'vitest'
import { messageText, parseArgs, parseCardList, parseRowsFile } from '../cliParse'

describe('comando stella', () => {
  it('legge argomenti e opzioni', () => {
    expect(parseArgs(['progetto', '--set', 'Oggetti', '--json', '--dpi=200', 'x'])).toEqual({
      positional: ['progetto', 'x'],
      flags: { set: 'Oggetti', json: true, dpi: '200' }
    })
  })

  it('legge gli elenchi di carte', () => {
    expect(parseCardList('1,3,5-7,3')).toEqual([1, 3, 5, 6, 7])
    expect(() => parseCardList('a')).toThrow()
  })

  it('legge righe da csv e json', () => {
    expect(parseRowsFile('nome,costo\nArco,2\nScudo\n', false)).toEqual({
      headers: ['nome', 'costo'],
      rows: [
        ['Arco', '2'],
        ['Scudo', '']
      ]
    })
    expect(parseRowsFile('[{"nome":"Arco","costo":2},{"nome":"Scudo","note":"x"}]', true)).toEqual({
      headers: ['nome', 'costo', 'note'],
      rows: [
        ['Arco', '2', ''],
        ['Scudo', '', 'x']
      ]
    })
    expect(parseRowsFile('[["a","b"],[1,null]]', true)).toEqual({
      headers: ['a', 'b'],
      rows: [['1', '']]
    })
  })

  it('traduce i messaggi in inglese', () => {
    expect(
      messageText({ key: 'bind.unknownRef', params: { layer: 'testo', name: 'x' } })
    ).toContain('{x}')
    expect(messageText({ key: 'chiave.sconosciuta' })).toBe('chiave.sconosciuta')
  })
})
