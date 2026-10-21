import { describe, expect, it } from 'vitest'
import { toRealPath, virtualRoot } from '../realPath'

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
})
