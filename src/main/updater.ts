import { app, net, type WebContents } from 'electron'
import { spawn, execFile } from 'child_process'
import { constants } from 'fs'
import { access, mkdir, readdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'
import { promisify } from 'util'
import { isPrerelease, type UpdateMode } from '../shared/update'

// Aggiornamento dall'app. Su Windows (installato con il setup) e Linux (AppImage) lo fa
// electron-updater, che legge i file beta.yml / latest.yml pubblicati con la release e sostituisce
// l'app senza firma. Sul Mac Squirrel vuole una firma Apple vera: l'app scarica lo zip della
// release (scaricato così non ha la quarantena), lo estrae accanto a sé e, appena si chiude, uno
// script la sostituisce e la riapre. La versione portabile di Windows e il .deb si aggiornano a
// mano, dalla pagina della release.

const DOWNLOAD = 'https://github.com/lucadj77/naibi/releases/download'

/** Il pacchetto .app che contiene questo eseguibile, sul Mac */
function macBundle(): string | null {
  const bundle = resolve(process.execPath, '..', '..', '..')
  return bundle.endsWith('.app') ? bundle : null
}

async function writable(path: string): Promise<boolean> {
  try {
    await access(path, constants.W_OK)
    return true
  } catch {
    return false
  }
}

/** Come si aggiorna questa installazione */
export async function updateMode(): Promise<UpdateMode> {
  if (!app.isPackaged) return 'manual'
  if (process.platform === 'win32') return process.env.PORTABLE_EXECUTABLE_DIR ? 'manual' : 'auto'
  if (process.platform === 'linux') return process.env.APPIMAGE ? 'auto' : 'manual'
  if (process.platform === 'darwin') {
    const bundle = macBundle()
    // un'app aperta senza spostarla in Applicazioni gira da una copia temporanea di macOS
    if (!bundle || bundle.includes('/AppTranslocation/')) return 'manual'
    return (await writable(dirname(bundle))) && (await writable(bundle)) ? 'auto' : 'manual'
  }
  return 'manual'
}

/** Scarica la versione e riavvia l'app aggiornata; il progresso va a sender, da 0 a 1 */
export async function installUpdate(version: string, sender: WebContents): Promise<void> {
  const progress = (p: number): void => {
    if (!sender.isDestroyed()) sender.send('update:progress', p)
  }
  if ((await updateMode()) !== 'auto') throw new Error('this installation updates by hand')
  if (process.platform === 'darwin') return installMac(version, progress)
  const { autoUpdater } = await import('electron-updater')
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  // chi ha una beta riceve anche le beta, come nel controllo dell'app
  autoUpdater.allowPrerelease = isPrerelease(app.getVersion())
  autoUpdater.on('download-progress', (p) => progress(p.percent / 100))
  const found = await autoUpdater.checkForUpdates()
  if (!found?.isUpdateAvailable) throw new Error('no update found')
  await autoUpdater.downloadUpdate()
  progress(1)
  // senza installazione guidata, e l'app si riapre
  setImmediate(() => autoUpdater.quitAndInstall(true, true))
}

async function installMac(version: string, progress: (p: number) => void): Promise<void> {
  const bundle = macBundle()
  if (!bundle) throw new Error('app bundle not found')
  const file = `Naibi-${version}-mac-${process.arch}.zip`
  const res = await net.fetch(`${DOWNLOAD}/v${version}/${file}`)
  if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status}`)
  const total = Number(res.headers.get('content-length')) || 0
  const chunks: Uint8Array[] = []
  let got = 0
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    got += value.length
    if (total) progress(Math.min(0.95, (got / total) * 0.95))
  }
  const zip = join(tmpdir(), file)
  await writeFile(zip, Buffer.concat(chunks))
  // estratta nella stessa cartella dell'app: lo scambio è uno spostamento sullo stesso disco
  const staging = join(dirname(bundle), '.naibi-update')
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })
  await promisify(execFile)('/usr/bin/ditto', ['-x', '-k', zip, staging])
  await rm(zip, { force: true })
  const found = (await readdir(staging)).find((n) => n.endsWith('.app'))
  if (!found) throw new Error('no app in the update')
  progress(1)
  const script = [
    'while kill -0 "$NAIBI_PID" 2>/dev/null; do sleep 0.3; done',
    'rm -rf "$NAIBI_OLD.old"',
    'if mv "$NAIBI_OLD" "$NAIBI_OLD.old"; then',
    '  if mv "$NAIBI_NEW" "$NAIBI_OLD"; then rm -rf "$NAIBI_OLD.old"; else mv "$NAIBI_OLD.old" "$NAIBI_OLD"; fi',
    'fi',
    'xattr -cr "$NAIBI_OLD" 2>/dev/null',
    'rm -rf "$NAIBI_STAGING"',
    'open "$NAIBI_OLD"'
  ].join('\n')
  const child = spawn('/bin/sh', ['-c', script], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      NAIBI_PID: String(process.pid),
      NAIBI_OLD: bundle,
      NAIBI_NEW: join(staging, found),
      NAIBI_STAGING: staging
    }
  })
  child.unref()
  setImmediate(() => app.quit())
}
