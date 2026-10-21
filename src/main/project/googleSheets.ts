import type { Sheet } from '../../shared/project'
import { MessageError, msg } from '../../shared/messages'
import { googleExportUrl, googleSheetId } from '../../shared/model/googleSheets'
import { readXlsx } from './spreadsheet'

type Fetch = (url: string) => Promise<Response>

/**
 * Scarica un foglio Google condiviso con chiunque abbia il link e ne legge le schede. Un foglio
 * privato non dà errore: Google risponde con la pagina di accesso, che non è un .xlsx.
 */
export async function fetchGoogleSheet(
  link: string,
  get: Fetch = (url) => fetch(url)
): Promise<Sheet[]> {
  const id = googleSheetId(link)
  if (!id) throw new MessageError(msg('gsheets.badLink'))
  let res: Response
  try {
    res = await get(googleExportUrl(id))
  } catch (e) {
    throw new MessageError(msg('gsheets.network', { text: e instanceof Error ? e.message : '' }))
  }
  if (res.status === 404) throw new MessageError(msg('gsheets.notFound'))
  if (res.status === 401 || res.status === 403) throw new MessageError(msg('gsheets.private'))
  if (!res.ok) throw new MessageError(msg('gsheets.network', { text: `HTTP ${res.status}` }))
  const data = Buffer.from(await res.arrayBuffer())
  // un .xlsx è uno zip: comincia con PK
  if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b)
    throw new MessageError(msg('gsheets.private'))
  return readXlsx(data)
}
