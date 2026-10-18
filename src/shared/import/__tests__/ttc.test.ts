import { describe, expect, it } from 'vitest'
import { normalizeTemplate } from '../../model/normalize'
import type { TextLayer } from '../../model/template'
import { convertRichText } from '../richText'
import { convertTtcProject, parseTtcJson } from '../ttc'

describe('rich text', () => {
  it('converts TextMeshPro tags into markup', () => {
    expect(convertRichText('<b>Forza</b> <color=#FF0000>rossa</color>').text).toBe(
      '**Forza** [rossa]{color=#FF0000}'
    )
    expect(convertRichText('a<br><align=center>b</align>').text).toBe('a\n{center} b')
    expect(convertRichText('<i> spazio </i>').text).toBe(' *spazio* ')
  })

  it('merges nested spans and escapes markup characters', () => {
    expect(convertRichText('<color=red><size=150%>X</size></color>').text).toBe(
      '[X]{color=red size=150%}'
    )
    expect(convertRichText('2*3 [a]').text).toBe('2\\*3 \\[a\\]')
  })

  it('reports tags it cannot convert', () => {
    expect(convertRichText('<sprite=1>x').unsupported).toEqual(['sprite'])
  })
})

const blueprint = {
  json_version: 5,
  blueprints: [
    {
      name: 'nemico',
      type: 'card',
      layout_size_mm: '41, 63',
      bleeding_size_mm: '0',
      main_panel_name: 'nome',
      shape_settings: { radius: '4' },
      front_groups: [
        {
          name: 'identita',
          panels: [
            {
              name: 'nome',
              data: {
                layout_position: '3, 2',
                layout_size: '35, 8',
                panel_type: 'text',
                value: 'ORCHI',
                color: '#FFFFFFFF',
                text_bold: 'True',
                text_autosize: 'True',
                text_size_max: '4.68'
              }
            },
            {
              name: 'fondo',
              data: {
                layout_position: '0, 0',
                layout_size: '41, 63',
                panel_type: 'procedural',
                color: '#4E9A2EFF'
              }
            }
          ]
        }
      ],
      back_groups: []
    }
  ]
}

const sets = {
  json_version: 5,
  sets: [
    {
      name: 'nemici',
      blueprint_name: 'nemico',
      items: [
        {
          amount: 2,
          details: [
            { name: 'nome', data: { value: 'GOBLIN {spada}' } },
            { name: 'fondo', data: { color: '#A62BA0FF' } }
          ]
        }
      ]
    }
  ]
}

const variables = {
  json_version: 5,
  variables: [
    { code: 'spada', replacement: 'Weapon/sword', force_tint: 'False', color: '#FFFFFF00' },
    { code: 'scudo', replacement: 'scudo', force_tint: 'True', color: '#4E9A2EFF' },
    { code: 'bold', replacement: 'x', force_tint: 'False', color: '#FFFFFF00' }
  ]
}

describe('Tabletop Creator project', () => {
  const r = convertTtcProject({ blueprints: [blueprint], sets: [sets], variables }, ['scudo.png'])

  it('converts blueprints into templates with mm sizes and a centre-based frame', () => {
    const tpl = normalizeTemplate(r.templates[0])
    expect(tpl).toMatchObject({ name: 'nemico', width: 41, height: 63, cornerRadius: 4 })
    const group = tpl.front[0]
    expect(group.type).toBe('group')
    const nome = (group.type === 'group' ? group.children[0] : null) as TextLayer
    expect(nome).toMatchObject({ type: 'text', name: 'nome', weight: 700, fit: 'shrink' })
    expect(nome.x).toBeCloseTo(3)
    expect(nome.w).toBeCloseTo(35)
  })

  it('converts sets into sheets with layer columns', () => {
    const sheet = r.sheets[0]
    expect(sheet.name).toBe('nemici')
    const row = Object.fromEntries(sheet.headers.map((h, i) => [h, sheet.rows[0][i]]))
    expect(row).toMatchObject({ amount: '2', nome: 'GOBLIN {spada}', fondo: '#A62BA0' })
  })

  it('converts variables, library icons and reserved names', () => {
    expect(r.file.variables?.spada).toMatchObject({
      type: 'image',
      src: 'library/Weapon/sword',
      tint: 'currentColor'
    })
    expect(r.file.variables?.scudo).toMatchObject({ type: 'image', src: 'scudo', tint: '#4E9A2E' })
    expect(r.file.variables?.bold_var).toBeDefined()
    expect(r.libraryIcons).toContain('Weapon/sword')
    expect(r.notes.map((n) => n.key)).toContain('ttc.renamedVariable')
  })
})

it('reads JSON with raw line breaks inside strings', () => {
  expect(parseTtcJson('{"a": "x\ny"}')).toEqual({ a: 'x\ny' })
})
