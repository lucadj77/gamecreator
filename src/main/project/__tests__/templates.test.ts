import { describe, expect, it } from 'vitest'
import { formatTemplate } from '../templates'

describe('formatTemplate', () => {
  it('scrive un livello per riga e va a capo nei gruppi', () => {
    const out = formatTemplate({
      width: 63,
      front: [
        {
          type: 'text',
          name: 'a',
          text: 'Ore 12:30, poi',
          x: 1,
          stroke: { color: '#FFF', width: 0.5 }
        },
        { type: 'group', name: 'g', children: [{ type: 'shape', name: 's', fill: null }] }
      ],
      back: []
    })
    expect(out).toBe(
      [
        '{',
        '  "width": 63,',
        '  "front": [',
        '    { "type": "text", "name": "a", "text": "Ore 12:30, poi", "x": 1, "stroke": {"color": "#FFF", "width": 0.5} },',
        '    {',
        '      "type": "group",',
        '      "name": "g",',
        '      "children": [',
        '        { "type": "shape", "name": "s", "fill": null }',
        '      ]',
        '    }',
        '  ],',
        '  "back": []',
        '}'
      ].join('\n')
    )
    expect(JSON.parse(out)).toBeTruthy()
  })
})
