import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { MessageError, msg } from '../../shared/messages'
import type { DocExportFile } from '../../shared/api'

// File esportati di un documento (PDF, HTML, Markdown con le immagini): vanno in export/docs/
// del progetto, accanto alle altre esportazioni.

export const DOC_EXPORT_DIR = 'docs'

/** Scrive i file in export/docs/ (o in `out`) e restituisce la cartella */
export async function writeDocumentExport(
  folder: string,
  files: DocExportFile[],
  out?: string
): Promise<string> {
  const dir = out ?? join(folder, 'export', DOC_EXPORT_DIR)
  for (const f of files) {
    const parts = f.path.split('/')
    // solo percorsi dentro la cartella
    if (!f.path || f.path.startsWith('/') || parts.some((p) => p === '..' || p === ''))
      throw new MessageError(msg('document.badExportPath', { path: f.path }))
    const file = join(dir, ...parts)
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, f.data)
  }
  return dir
}
