import { describe, expect, it } from 'vitest'
import { realPathMatches, toRealPath, virtualRoot } from '../realPath'

describe('realPath', () => {
  it('finds the chosen folder of a virtual path', () => {
    expect(virtualRoot('/Saved Objects/Stella/images/a.png')).toBe('/Saved Objects')
  })
  it('builds Windows paths', () => {
    expect(
      toRealPath(
        '/Saved Objects/Stella/images/a.png',
        'C:\\Users\\luca\\Documents\\My Games\\Tabletop Simulator\\Saves\\Saved Objects\\'
      )
    ).toEqual({
      path: 'C:\\Users\\luca\\Documents\\My Games\\Tabletop Simulator\\Saves\\Saved Objects\\Stella\\images\\a.png',
      platform: 'win32'
    })
  })
  it('builds macOS and Linux paths', () => {
    expect(toRealPath('/TTS/Stella/a.png', '/Users/luca/Documents/TTS/')).toEqual({
      path: '/Users/luca/Documents/TTS/Stella/a.png',
      platform: 'darwin'
    })
  })
  it('checks that the path is the chosen folder', () => {
    expect(realPathMatches('/Saved Objects/x', 'C:\\a\\Saved Objects\\')).toBe(true)
    expect(realPathMatches('/Saved Objects (2)/x', '/Users/l/Saved Objects')).toBe(true)
    expect(realPathMatches('/Stella TTS/x', '/Users/l/Documents')).toBe(false)
  })
})
