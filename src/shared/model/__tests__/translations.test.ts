import { describe, expect, it } from 'vitest'
import { bindCard, rowToCard } from '../bind'
import { documentLocalization, documentProblems, documentSettings, documentText } from '../document'
import { resolveTemplates } from '../inherit'
import { missingTranslations } from '../language'
import { normalizeTemplate } from '../normalize'
import type { TextLayer } from '../template'
import { variableFields, type Variables } from '../variables'

const variables: Variables = {
  attacco: { type: 'text', text: 'Attacco', texts: { en: 'Attack' } },
  difesa: { type: 'text', text: 'Difesa' },
  costo: { type: 'value', value: 'uno', values: { en: 'one', fr: ' ' } }
}

const template = normalizeTemplate({
  name: 't',
  front: [
    {
      type: 'text',
      name: 'titolo',
      text: 'Carta',
      texts: { en: 'Card' },
      source: { kind: 'fixed' }
    },
    { type: 'text', name: 'nota', text: 'Nota {nome}', source: { kind: 'fixed' } },
    {
      type: 'value',
      name: 'tipo',
      value: 'Fuoco',
      values: { en: 'Fire' },
      source: { kind: 'fixed' }
    },
    {
      type: 'text',
      name: 'etichetta',
      text: '',
      source: { kind: 'formula', expr: '=IF({tipo}="Fuoco";"{attacco}";"{difesa}")' }
    },
    { type: 'text', name: 'mostra', text: '{tipo} {costo}', source: { kind: 'fixed' } },
    { type: 'text', name: 'nome', text: '' }
  ]
})

const texts = (t: { front: unknown[] }): Record<string, string> =>
  Object.fromEntries(
    (t.front as TextLayer[]).filter((l) => l.type === 'text').map((l) => [l.name, l.text])
  )

describe('traduzioni di testi fissi e variabili', () => {
  it('le variabili usano la traduzione, o il testo principale se manca o è vuota', () => {
    expect(variableFields(variables, 'en')).toMatchObject({
      attacco: 'Attack',
      difesa: 'Difesa',
      costo: 'one'
    })
    expect(variableFields(variables, 'fr')).toMatchObject({ attacco: 'Attacco', costo: 'uno' })
    expect(variableFields(variables)).toMatchObject({ attacco: 'Attacco', costo: 'uno' })
  })

  it('nella lingua principale non cambia nulla', () => {
    const b = bindCard(template, rowToCard(['nome'], ['Drago']), { variables })
    expect(texts(b.template)).toMatchObject({
      titolo: 'Carta',
      nota: 'Nota Drago',
      etichetta: 'Attacco',
      mostra: 'Fuoco uno'
    })
  })

  it('nella lingua scelta: testi fissi, valori e variabili tradotti; le formule confrontano la principale', () => {
    const b = bindCard(template, rowToCard(['nome', 'nome@en'], ['Drago', 'Dragon']), {
      variables,
      localization: { language: 'en' }
    })
    expect(b.problems).toEqual([])
    expect(texts(b.template)).toMatchObject({
      titolo: 'Card',
      nota: 'Nota Dragon',
      // la condizione vede "Fuoco", il risultato {attacco} si traduce
      etichetta: 'Attack',
      mostra: 'Fire one'
    })
  })

  it('un derivato che cambia il testo non tiene le traduzioni del base', () => {
    const [derived, kept] = resolveTemplates([
      normalizeTemplate({
        name: 'd',
        extends: 't',
        changes: { layers: { titolo: { text: 'Mostro' }, nota: { texts: { en: 'Note {nome}' } } } }
      }),
      normalizeTemplate({ name: 'e', extends: 't', changes: { layers: { titolo: { size: 20 } } } }),
      template
    ]).templates
    const layer = (t: typeof derived, n: string): TextLayer =>
      t.front.find((l) => l.name === n) as TextLayer
    expect(layer(derived, 'titolo').texts).toBeUndefined()
    expect(layer(derived, 'nota').texts).toEqual({ en: 'Note {nome}' })
    expect(layer(kept, 'titolo').texts).toEqual({ en: 'Card' })
  })

  it('elenca le traduzioni mancanti', () => {
    const missing = missingTranslations(
      {
        templates: [template],
        variables,
        sets: [
          {
            name: 'Eroi',
            data: {
              name: 'Eroi',
              headers: ['nome', 'nome@en', 'costo'],
              rows: [
                ['Drago', 'Dragon', '3'],
                ['Orco', '', '2'],
                ['12', '', '1']
              ]
            }
          }
        ]
      },
      'en'
    ).map((m) => m.where)
    expect(missing).toEqual([
      'template t, layer nota (front)',
      'variable difesa',
      'Eroi #2, column nome@en'
    ])
    // in francese anche il valore tradotto solo in inglese
    const fr = missingTranslations({ templates: [template], variables, sets: [] }, 'fr')
    expect(fr.map((m) => m.where)).toContain('variable costo')
    expect(fr.map((m) => m.where)).toContain('template t, layer tipo (front)')
  })
})

describe('lingua dei documenti', () => {
  const file = { languages: ['it', 'en'], names: { en: 'Siege' } }

  it('language (o lang) nella testa sceglie la lingua delle carte', () => {
    expect(documentSettings('---\nlanguage: en\n---\n').settings.language).toBe('en')
    expect(documentSettings('---\nlang: en\n---\n').settings.language).toBe('en')
    expect(documentLocalization(file, [], '---\nlang: en\n---\n')).toEqual({
      language: 'en',
      project: 'Siege'
    })
    // senza impostazione la lingua principale; --lang vince sulla testa
    expect(documentLocalization(file, [], '# Regole')).toBeUndefined()
    expect(documentLocalization(file, [], '---\nlang: en\n---\n', 'it')).toBeUndefined()
  })

  it('segnala una lingua che il progetto non ha', () => {
    const src = '---\nlanguage: fr\n---\n# Regole\n'
    const problems = documentProblems(src, { languages: ['it', 'en'] })
    expect(problems.map((p) => p.message.key)).toContain('doc.language.unknown')
    expect(documentProblems('---\nlanguage: en\n---\n', { languages: ['it', 'en'] })).toEqual([])
  })

  it('le variabili nel testo seguono la lingua del documento', () => {
    expect(documentText('{attacco}', { variables, language: 'en' })).toBe('Attack')
    expect(documentText('{attacco}', { variables })).toBe('Attacco')
  })
})
