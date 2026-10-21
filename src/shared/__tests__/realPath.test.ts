import { describe, expect, it } from 'vitest'
import { realPathMatches, toRealPath, virtualRoot } from '../realPath'

describe('realPath', () => {
  it('finds the chosen folder of a virtual path', () => {
    expect(virtualRoot('/Saved Objects/Naibi/images/a.png')).toBe('/Saved Objects')
  })
  it('builds Windows paths', () => {
    expect(
      toRealPath(
        '/Saved Objects/Naibi/images/a.png',
        'C:\\Users\\luca\\Documents\\My Games\\Tabletop Simulator\\Saves\\Saved Objects\\'
      )
    ).toEqual({
      path: 'C:\\Users\\luca\\Documents\\My Games\\Tabletop Simulator\\Saves\\Saved Objects\\Naibi\\images\\a.png',
      platform: 'win32'
    })
  })
  it('builds macOS and Linux paths', () => {
    expect(toRealPath('/TTS/Naibi/a.png', '/Users/luca/Documents/TTS/')).toEqual({
      path: '/Users/luca/Documents/TTS/Naibi/a.png',
      platform: 'darwin'
    })
  })
  it('checks that the path is the chosen folder', () => {
    expect(realPathMatches('/Saved Objects/x', 'C:\\a\\Saved Objects\\')).toBe(true)
    expect(realPathMatches('/Saved Objects (2)/x', '/Users/l/Saved Objects')).toBe(true)
    expect(realPathMatches('/Naibi TTS/x', '/Users/l/Documents')).toBe(false)
  })
})
