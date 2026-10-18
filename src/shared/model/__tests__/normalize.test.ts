import { describe, expect, it } from 'vitest'
import { denormalizeTemplate, isValidTemplateName, normalizeTemplate } from '../normalize'

describe('denormalizeTemplate', () => {
  it('scrive solo le proprietà diverse dai default', () => {
    const raw = {
      name: 't',
      front: [
        { type: 'text', name: 'nome', x: 4, text: 'Ciao', size: 12 },
        { type: 'group', name: 'g', children: [{ type: 'shape', name: 's', fill: null }] }
      ]
    }
    const t = normalizeTemplate(raw)
    t.front[0].y = 1.0000000001
    const out = denormalizeTemplate(t)
    expect(out.front).toEqual([
      { type: 'text', name: 'nome', x: 4, y: 1, text: 'Ciao', size: 12 },
      { type: 'group', name: 'g', children: [{ type: 'shape', name: 's', fill: null }] }
    ])
    // il giro completo non perde nulla
    const again = normalizeTemplate(out)
    expect(denormalizeTemplate(again)).toEqual(out)
  })

  it('accetta solo nomi utilizzabili come file', () => {
    expect(isValidTemplateName('personaggio')).toBe(true)
    expect(isValidTemplateName('carta grande')).toBe(true)
    expect(isValidTemplateName('../x')).toBe(false)
    expect(isValidTemplateName('a/b')).toBe(false)
    expect(isValidTemplateName(' a')).toBe(false)
    expect(isValidTemplateName('')).toBe(false)
  })
})
