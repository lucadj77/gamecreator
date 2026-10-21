import { app, shell, BrowserWindow, dialog, ipcMain, nativeTheme, net } from 'electron'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadProject } from './project/load'
import { saveTemplate, trashTemplate } from './project/templates'
import { saveNote, trashNote } from './project/notes'
import { dropDeleted, listDeleted, readDeleted } from './project/trash'
import { createProject } from './project/create'
import { addRecent, hasThumbnail, listRecent, removeRecent, saveThumbnail } from './project/recent'
import { saveData, type DataChanges } from './project/save'
import {
  getProjectFolder,
  handleAssetProtocol,
  registerAssetScheme,
  setProjectFolder
} from './protocol'
import { MessageError, msg } from '../shared/messages'
import type { Template } from '../shared/model/template'
import type { BackupSettings, BackupState, Theme, TtcImportOptions } from '../shared/api'
import { defaultTarget, importTtc } from './import/ttc'
import { runExport } from './export/run'
import { ExportWindow } from './export/window'
import { toCmyk } from './export/cmyk'
import { saveExportProfiles } from './project/exportProfiles'
import { fontCatalog, iconCatalog } from './library/catalogs'
import { updateGameIcons, updateGoogleFonts } from './library/catalogUpdate'
import {
  iconifyCollection,
  iconifyCollections,
  iconifySearch,
  iconifySvgs,
  importIconifyIcons
} from './library/iconify'
import { importIcons } from './library/icons'
import { copyImages } from './library/images'
import { assetsUpdate } from './library/sources'
import { IMAGE_EXTENSIONS } from '../shared/model/assets'
import { downloadGoogleFont } from './library/googleFonts'
import { adoptLegacyData } from './legacyData'
import { runCli } from './cli'
import { RELEASES_API, updateFromReleases } from '../shared/update'
import { backupDirFor, backupSettingsFile, defaultBackupRoot } from './project/backupPaths'
import {
  autoBackup,
  backupsSize,
  createBackup,
  listBackups,
  readBackupSettings,
  restoreBackup,
  writeBackupSettings
} from './project/backup'
import { copySystemFont, systemFonts } from './library/systemFonts'
import {
  APP_STATE_HEARTBEAT,
  clearAppState,
  endAgent,
  readAgentLock,
  writeAppState
} from './project/agentLock'
import type { FontVariant, IconCollection, IconImport } from '../shared/library'
import {
  defaultTtsFolder,
  type ExportContext,
  type ExportJob,
  type ExportProfiles
} from '../shared/export'

/** Progetto aperto nell'app, per il blocco mentre lavora un'IA */
let stateFolder: string | null = null
/** Ultimo blocco inviato al renderer, per mandare solo i cambiamenti */
let lockJson: string | undefined
/** Se il progetto aperto ha modifiche non salvate, per riscrivere lo stato a intervalli */
let stateDirty = false

/**
 * Lo stato dell'app si riscrive a intervalli: da un altro computer (progetto su un disco
 * condiviso) il processo non si può controllare e conta solo quanto è recente il file
 */
async function touchAppState(): Promise<void> {
  if (stateFolder) await writeAppState(stateFolder, stateDirty)
}

async function pollAgentLock(): Promise<void> {
  if (!stateFolder) return
  const json = JSON.stringify(await readAgentLock(stateFolder))
  if (json === lockJson) return
  lockJson = json
  for (const w of BrowserWindow.getAllWindows()) w.webContents.send('agent:lock', JSON.parse(json))
}

/** Argomenti del comando naibi: tutto ciò che segue --cli (vedi cli.ts) */
const cliIndex = process.argv.indexOf('--cli')
const cliArgs = cliIndex >= 0 ? process.argv.slice(cliIndex + 1) : null

// versione portable per Windows: i dati dell'app (recenti, preferenze, cataloghi) stanno accanto
// al file .exe, così la cartella si porta su un'altra macchina o una chiavetta
if (process.env.PORTABLE_EXECUTABLE_DIR)
  app.setPath('userData', join(process.env.PORTABLE_EXECUTABLE_DIR, 'Naibi data'))
else adoptLegacyData()
registerAssetScheme()

if (cliArgs) {
  // senza finestre e senza icona nel Dock: si disegna nella finestra nascosta dell'esportazione
  app.dock?.hide()
  // solo gli errori gravi di Chromium: l'output è per chi ha lanciato il comando
  app.commandLine.appendSwitch('log-level', '3')
  app.whenReady().then(async () => {
    handleAssetProtocol()
    const code = await runCli(cliArgs)
    app.exit(code)
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'Naibi',
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Nome del progetto aperto, per la cartella dei backup */
let projectName = ''

/** I backup si fanno uno alla volta: la pulizia non deve togliere file a un backup in corso */
let backupQueue: Promise<unknown> = Promise.resolve()
function queued<T>(job: () => Promise<T>): Promise<T> {
  const run = backupQueue.then(job, job)
  backupQueue = run.catch(() => undefined)
  return run
}

async function backupDir(settings?: BackupSettings): Promise<string> {
  const folder = getProjectFolder()
  if (!folder) throw new MessageError(msg('template.noProject'))
  return (await backupDirFor(folder, projectName, settings)).dir
}

async function backupState(): Promise<BackupState> {
  const settings = await readBackupSettings(backupSettingsFile())
  const folder = await backupDir(settings)
  return {
    folder,
    defaultFolder: defaultBackupRoot(),
    settings,
    items: await listBackups(folder),
    totalSize: await backupsSize(folder)
  }
}

function registerIpc(): void {
  ipcMain.handle('project:choose-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Apri progetto',
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('project:load', async (_, folder: string) => {
    const project = await loadProject(folder)
    setProjectFolder(folder)
    projectName = project.file.name || folder
    // il backup automatico non ritarda l'apertura, e un errore non la impedisce
    readBackupSettings(backupSettingsFile())
      .then(async (settings) => {
        const { dir } = await backupDirFor(folder, projectName, settings)
        const name = projectName
        return queued(() => autoBackup(folder, name, dir, settings))
      })
      .catch((e) => console.error(e))
    // l'elenco dei recenti non è essenziale: un errore non impedisce di aprire il progetto
    await addRecent(folder, project.file.name).catch((e) => console.error(e))
    return project
  })

  ipcMain.handle('recent:list', () => listRecent())
  ipcMain.handle('recent:remove', (_, folder: string) => removeRecent(folder))

  // la miniatura è sempre quella del progetto aperto: le immagini arrivano da lì
  ipcMain.handle(
    'project:thumbnail',
    async (_, template: Template, context: ExportContext, onlyIfMissing: boolean) => {
      const folder = getProjectFolder()
      if (!folder || (onlyIfMissing && (await hasThumbnail(folder)))) return
      await saveThumbnail(folder, template, context)
    }
  )

  ipcMain.handle('project:default-parent', () => join(app.getPath('documents'), 'Naibi'))
  ipcMain.handle('project:create', (_, name: string, parent: string, data?: 'xlsx' | 'ods') =>
    createProject(name, parent, data)
  )

  // si scrive solo nel progetto aperto, qualunque cartella arrivi dal renderer
  ipcMain.handle('template:save', async (_, template: Template) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    await saveTemplate(folder, template)
  })

  ipcMain.handle('template:delete', async (_, file: string) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    return trashTemplate(folder, file)
  })

  ipcMain.handle('note:save', async (_, name: string, text: string, oldName?: string) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    await saveNote(folder, name, text, oldName)
  })

  ipcMain.handle('note:delete', async (_, name: string) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    await trashNote(folder, name)
  })

  ipcMain.handle('trash:list', async () => {
    const folder = getProjectFolder()
    return folder ? listDeleted(folder) : []
  })

  ipcMain.handle('trash:read', async (_, file: string) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    return readDeleted(folder, file)
  })

  ipcMain.handle('trash:drop', async (_, files: string[]) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    await dropDeleted(folder, files)
  })

  ipcMain.handle('data:save', async (_, changes: DataChanges) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    await saveData(folder, changes)
  })

  let cancelExport = false
  ipcMain.handle('export:run', async (event, job: ExportJob, context: ExportContext) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    cancelExport = false
    return runExport(job, {
      openWindow: (context) => ExportWindow.open(context),
      toCmyk,
      projectFolder: folder,
      platform: process.platform,
      home: app.getPath('home'),
      documents: app.getPath('documents'),
      context,
      onProgress: (p) => !event.sender.isDestroyed() && event.sender.send('export:progress', p),
      isCancelled: () => cancelExport
    })
  })
  ipcMain.on('export:cancel', () => (cancelExport = true))

  ipcMain.handle('export:choose-folder', async (_, current: string) => {
    const result = await dialog.showOpenDialog({
      defaultPath: current || undefined,
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('export:save-profiles', async (_, profiles: ExportProfiles) => {
    const folder = getProjectFolder()
    if (folder) await saveExportProfiles(folder, profiles)
  })

  ipcMain.handle('export:default-folders', () => {
    const folder = getProjectFolder()
    return {
      export: folder ? join(folder, 'export') : '',
      tts: defaultTtsFolder(process.platform, app.getPath('home'), app.getPath('documents'))
    }
  })

  ipcMain.handle('shell:show-folder', (_, path: string) => shell.openPath(path))

  ipcMain.handle('library:icon-catalog', (_, collection: IconCollection) => iconCatalog(collection))
  ipcMain.handle('library:font-catalog', () => fontCatalog())
  ipcMain.handle('library:update-catalog', (_, which: string) =>
    which === 'google-fonts' ? updateGoogleFonts() : updateGameIcons()
  )
  ipcMain.handle('iconify:collections', () => iconifyCollections())
  ipcMain.handle('iconify:collection', (_, prefix: string) => iconifyCollection(prefix))
  ipcMain.handle('iconify:search', (_, query: string, prefix?: string) =>
    iconifySearch(query, prefix)
  )
  ipcMain.handle('iconify:svgs', (_, ids: string[]) => iconifySvgs(ids))
  ipcMain.handle('iconify:import', async (_, items: IconImport[]) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    return importIconifyIcons(folder, items)
  })

  ipcMain.handle(
    'library:import-icons',
    async (_, collection: IconCollection, items: IconImport[]) => {
      const folder = getProjectFolder()
      if (!folder) throw new MessageError(msg('template.noProject'))
      return importIcons(folder, collection, items)
    }
  )

  ipcMain.handle('library:download-font', async (_, family: string, variants: FontVariant[]) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    return downloadGoogleFont(folder, family, variants)
  })

  ipcMain.handle('library:system-fonts', () => systemFonts())

  ipcMain.handle('library:copy-system-font', async (_, family: string) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    return copySystemFont(folder, family)
  })

  ipcMain.handle('library:add-images', async () => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS.map((e) => e.slice(1)) }]
    })
    if (result.canceled || !result.filePaths.length) return null
    await copyImages(folder, result.filePaths)
    return assetsUpdate(folder)
  })

  ipcMain.handle('library:save-credits', async (_, text: string) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    await mkdir(join(folder, 'export'), { recursive: true })
    const file = join(folder, 'export', 'credits.txt')
    await writeFile(file, text)
    return file
  })
  ipcMain.handle('folder:choose', async (_, current?: string) => {
    const result = await dialog.showOpenDialog({
      defaultPath: current || undefined,
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Strumenti per gli agenti IA: il comando naibi di questa installazione e la skill da salvare.
  // Vedi docs/cli.md.
  ipcMain.handle('ai:command', () => {
    if (app.isPackaged) {
      // su Windows naibi.exe è un programma a finestre: il terminale non ne aspetterebbe la fine
      // né il codice di uscita. naibi-cli.cmd, installato accanto, lo avvia nel modo giusto
      const cmd = join(dirname(process.execPath), 'naibi-cli.cmd')
      if (process.platform === 'win32' && existsSync(cmd))
        return { command: `"${cmd}"`, ready: true }
      return { command: `"${process.execPath}" --cli`, ready: true }
    }
    const root = app.getAppPath()
    return {
      command: `node "${join(root, 'bin', 'naibi.mjs')}"`,
      ready: existsSync(join(root, 'out', 'renderer', 'index.html'))
    }
  })
  ipcMain.handle('app:version', () => app.getVersion())
  // l'ultima release su GitHub, se è più recente di questa versione; senza rete la richiesta
  // fallisce, e il renderer all'avvio tace mentre a un controllo chiesto a mano lo dice
  ipcMain.handle('update:check', async () => {
    const res = await net.fetch(RELEASES_API, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `Naibi/${app.getVersion()}`
      }
    })
    if (!res.ok) throw new Error(`GitHub ${res.status}`)
    return updateFromReleases(await res.json(), app.getVersion())
  })
  ipcMain.handle('ai:save-skill', async (_, folder: string, text: string) => {
    const file = join(folder, 'naibi', 'SKILL.md')
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text)
    return file
  })
  ipcMain.handle('ai:skills-folder', () => {
    const folder = join(app.getPath('home'), '.claude', 'skills')
    return existsSync(folder) ? folder : app.getPath('documents')
  })

  ipcMain.handle('backup:list', () => backupState())
  ipcMain.handle('backup:create', async () => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    const dir = await backupDir()
    const name = projectName
    return queued(() => createBackup(folder, name, dir))
  })
  ipcMain.handle('backup:settings', async (_, settings: BackupSettings) => {
    await writeBackupSettings(backupSettingsFile(), settings)
    return backupState()
  })
  // si estraggono solo i backup del progetto aperto, accanto al progetto
  ipcMain.handle('backup:restore', async (_, file: string) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    if (dirname(resolve(file)) !== resolve(await backupDir())) throw new Error('not a backup')
    return restoreBackup(file, dirname(folder))
  })

  ipcMain.handle('ttc:default-target', (_, source: string) => defaultTarget(source))
  // l'importazione scrive solo nella cartella di destinazione, che deve essere nuova o vuota
  ipcMain.handle('ttc:import', (_, options: TtcImportOptions) => importTtc(options))

  // Blocco mentre lavora un'IA (vedi project/agentLock.ts): il renderer dice se ha modifiche non
  // salvate, qui si scrive il file per `naibi begin` e si controlla ogni secondo il file dell'IA
  ipcMain.handle('agent:app-state', async (_, folder: string | null, dirty: boolean) => {
    if (stateFolder && stateFolder !== folder) clearAppState(stateFolder)
    stateFolder = folder
    stateDirty = dirty
    lockJson = undefined
    if (folder) await writeAppState(folder, dirty)
  })
  ipcMain.handle('agent:unlock', () => stateFolder && endAgent(stateFolder))

  // il renderer segue prefers-color-scheme, che Chromium ricava da themeSource
  ipcMain.on('theme:set', (_, theme: Theme) => {
    if (theme === 'system' || theme === 'light' || theme === 'dark') nativeTheme.themeSource = theme
  })
}

if (!cliArgs)
  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.naibi.app')
    // nell'app pacchettizzata l'icona del Dock viene dal pacchetto; con npm run dev si imposta qui
    if (process.platform === 'darwin' && is.dev) app.dock?.setIcon(icon)

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    handleAssetProtocol()
    registerIpc()
    createWindow()
    setInterval(() => pollAgentLock().catch((e) => console.error(e)), 1000)
    setInterval(() => touchAppState().catch((e) => console.error(e)), APP_STATE_HEARTBEAT)
    app.on('will-quit', () => stateFolder && clearAppState(stateFolder))

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

app.on('window-all-closed', () => {
  // il comando naibi esce da solo quando ha finito
  if (process.platform !== 'darwin' && !cliArgs) {
    app.quit()
  }
})
