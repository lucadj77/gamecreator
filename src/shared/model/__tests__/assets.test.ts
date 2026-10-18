import { describe, expect, it } from 'vitest'
import { resolveAsset } from '../assets'

const assets = [
  'icons/spada.svg',
  'images/Cavaliere.png',
  'images/scudo.png',
  'icons/scudo.svg',
  'a/x.png',
  'b/x.png'
]

describe('resolveAsset', () => {
  it('trova un file per nome senza estensione e senza cartella', () => {
    expect(resolveAsset('spada', assets)).toEqual({ ok: true, path: 'icons/spada.svg' })
    expect(resolveAsset('cavaliere', assets)).toEqual({ ok: true, path: 'images/Cavaliere.png' })
  })

  it('accetta estensione o percorso per togliere ambiguità', () => {
    expect(resolveAsset('scudo', assets)).toMatchObject({ ok: false, reason: 'ambiguous' })
    expect(resolveAsset('scudo.svg', assets)).toEqual({ ok: true, path: 'icons/scudo.svg' })
    expect(resolveAsset('x', assets)).toMatchObject({ ok: false, reason: 'ambiguous' })
    expect(resolveAsset('b/x', assets)).toEqual({ ok: true, path: 'b/x.png' })
    expect(resolveAsset('assets/a/x.png', assets)).toEqual({ ok: true, path: 'a/x.png' })
  })

  it('segnala file mancanti e nomi vuoti', () => {
    expect(resolveAsset('drago', assets)).toMatchObject({ ok: false, reason: 'missing' })
    expect(resolveAsset('  ', assets)).toMatchObject({ ok: false, reason: 'empty' })
  })
})
