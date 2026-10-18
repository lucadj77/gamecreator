import { describe, expect, it } from 'vitest'
import { projectFolderName } from '../projectName'

describe('projectFolderName', () => {
  it('keeps ordinary names', () => {
    expect(projectFolderName('Assedio 2')).toBe('Assedio 2')
  })

  it('replaces characters not allowed in file names', () => {
    expect(projectFolderName('Gioco: prova/1')).toBe('Gioco prova 1')
    expect(projectFolderName('a<b>c|d?e*f"g\\h')).toBe('a b c d e f g h')
  })

  it('drops trailing dots and spaces, which Windows does not allow', () => {
    expect(projectFolderName('  Mesh...  ')).toBe('Mesh')
  })

  it('returns an empty string when nothing usable is left', () => {
    expect(projectFolderName('')).toBe('')
    expect(projectFolderName('///')).toBe('')
    expect(projectFolderName('..')).toBe('')
  })
})
