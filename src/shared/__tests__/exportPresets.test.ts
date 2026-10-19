import { describe, expect, it } from 'vitest'
import { DEFAULT_IMAGE, DEFAULT_PDF, DEFAULT_TTS } from '../export'
import { EXPORT_PRESETS } from '../exportPresets'

describe('preset di esportazione', () => {
  it('usano solo opzioni che esistono e non toccano set e cartella', () => {
    const defaults = { images: DEFAULT_IMAGE, pdf: DEFAULT_PDF, tts: DEFAULT_TTS }
    for (const { profile } of EXPORT_PRESETS) {
      const known = Object.keys(defaults[profile.kind])
      for (const k of Object.keys(profile.options)) expect(known).toContain(k)
      expect(profile.options).not.toHaveProperty('sets')
      expect(profile.options).not.toHaveProperty('folder')
    }
  })
})
