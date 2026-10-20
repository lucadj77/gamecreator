import { describe, expect, it } from 'vitest'
import {
  cleanBody,
  iconSvgs,
  licenseClass,
  parseCollectionIcons,
  parseCollections,
  parseSearch,
  splitIconId,
  svgForFile
} from '../iconify'

describe('licenseClass', () => {
  it('tells free, attribution and restricted licenses apart', () => {
    expect(licenseClass('MIT')).toBe('free')
    expect(licenseClass('Apache-2.0')).toBe('free')
    expect(licenseClass('CC0-1.0')).toBe('free')
    expect(licenseClass('CC-BY-4.0')).toBe('attribution')
    expect(licenseClass('CC-BY-SA-4.0')).toBe('restricted')
    expect(licenseClass('CC-BY-NC-4.0')).toBe('restricted')
    expect(licenseClass('GPL-3.0-or-later')).toBe('restricted')
    expect(licenseClass(undefined)).toBe('restricted')
  })
})

describe('parseCollections', () => {
  it('reads the collections and skips hidden ones', () => {
    const sets = parseCollections({
      mdi: {
        name: 'Material Design Icons',
        total: 7447,
        author: { name: 'Pictogrammers', url: 'https://x' },
        license: { title: 'Apache 2.0', spdx: 'Apache-2.0' },
        samples: ['sword'],
        palette: false
      },
      old: { name: 'Old', hidden: true },
      twemoji: { name: 'Twitter Emoji', total: 3, license: { title: 'CC BY 4.0' }, palette: true }
    })
    expect(sets.map((s) => s.prefix)).toEqual(['mdi', 'twemoji'])
    expect(sets[0].author).toEqual({ name: 'Pictogrammers', url: 'https://x' })
    expect(sets[1].palette).toBe(true)
  })
})

describe('parseCollectionIcons and parseSearch', () => {
  it('merges categories and uncategorized icons', () => {
    const r = parseCollectionIcons({
      categories: { Weapons: ['sword', 'axe'], Tools: ['axe', 'hammer'] },
      uncategorized: ['zz']
    })
    expect(r.icons).toEqual(['axe', 'hammer', 'sword', 'zz'])
    expect(r.categories.Tools).toEqual(['axe', 'hammer'])
  })
  it('keeps only prefixed ids', () => {
    expect(parseSearch({ icons: ['mdi:sword', 'bad'] })).toEqual(['mdi:sword'])
  })
})

describe('iconSvgs', () => {
  const data = {
    prefix: 'mdi',
    width: 24,
    height: 24,
    icons: { sword: { body: '<path fill="currentColor" d="M1 1"/>' } },
    aliases: { blade: { parent: 'sword' }, flipped: { parent: 'sword', hFlip: true } }
  }
  it('builds the svg with the viewBox of the collection', () => {
    const s = iconSvgs(data)
    expect(s.sword).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
        '<path fill="currentColor" d="M1 1"/></svg>'
    )
    expect(s.blade).toBe(s.sword)
    expect(s.flipped).toContain('<g transform="translate(24 0) scale(-1 1)">')
  })
  it('makes single color icons black in the file', () => {
    expect(svgForFile(iconSvgs(data).sword, false)).toContain('fill="#000"')
    expect(svgForFile('<path fill="currentColor"/>', true)).toContain('currentColor')
  })
})

describe('cleanBody', () => {
  it('drops scripts and event handlers', () => {
    expect(cleanBody('<path onload="x()" d="M1"/><script>alert(1)</script>')).toBe('<path d="M1"/>')
  })
})

describe('splitIconId', () => {
  it('accepts prefix:name only', () => {
    expect(splitIconId('game-icons:broadsword')).toEqual({
      prefix: 'game-icons',
      name: 'broadsword'
    })
    expect(splitIconId('mdi:../x')).toBeNull()
  })
})
