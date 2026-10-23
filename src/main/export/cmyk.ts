import { execFile } from 'child_process'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/** Ghostscript, se installato: dalle app aperte dal Finder il PATH non comprende Homebrew */
async function findGhostscript(): Promise<string | null> {
  const names = process.platform === 'win32' ? ['gswin64c', 'gswin32c', 'gs'] : ['gs']
  const dirs = ['', '/opt/homebrew/bin/', '/usr/local/bin/', '/usr/bin/']
  for (const dir of dirs)
    for (const name of names)
      try {
        await execFileAsync(dir + name, ['--version'])
        return dir + name
      } catch {
        // si prova il prossimo
      }
  return null
}

/** Il PDF convertito in CMYK, o null se Ghostscript non c'è o la conversione non riesce */
export async function toCmyk(pdf: Buffer): Promise<Buffer | null> {
  const gs = await findGhostscript()
  if (!gs) return null
  const dir = await mkdtemp(join(tmpdir(), 'stella-cmyk-'))
  try {
    const input = join(dir, 'rgb.pdf')
    const output = join(dir, 'cmyk.pdf')
    await writeFile(input, pdf)
    await execFileAsync(gs, [
      '-q',
      '-dNOPAUSE',
      '-dBATCH',
      '-dSAFER',
      '-sDEVICE=pdfwrite',
      '-sColorConversionStrategy=CMYK',
      '-sProcessColorModel=DeviceCMYK',
      `-sOutputFile=${output}`,
      input
    ])
    return await readFile(output)
  } catch {
    return null
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
