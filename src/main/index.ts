import { app, shell, BrowserWindow, dialog, ipcMain, nativeTheme } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadProject } from './project/load'
import { saveTemplate, trashTemplate } from './project/templates'
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
import { saveExportProfiles } from './project/exportProfiles'
import { fontCatalog, iconCatalog } from './library/catalogs'
import { importIcons } from './library/icons'
import { downloadGoogleFont } from './library/googleFonts'
import { adoptLegacyData } from './legacyData'
import {
  autoBackup,
  backupDirName,
  createBackup,
  listBackups,
  readBackupSettings,
  restoreBackup,
  writeBackupSettings
} from './project/backup'
import { copySystemFont, systemFonts } from './library/systemFonts'
import type { FontVariant, IconCollection, IconImport } from '../shared/library'
import {
  defaultTtsFolder,
  type ExportContext,
  type ExportJob,
  type ExportProfiles
} from '../shared/export'

adoptLegacyData()
registerAssetScheme()

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

const backupSettingsFile = (): string => join(app.getPath('userData'), 'backup-settings.json')
const defaultBackupRoot = (): string => join(app.getPath('documents'), 'Naibi', 'Backup')
/** Nome del progetto aperto, per la cartella dei backup */
let projectName = ''

async function backupDir(settings?: BackupSettings): Promise<string> {
  const s = settings ?? (await readBackupSettings(backupSettingsFile()))
  return join(s.folder || defaultBackupRoot(), backupDirName(projectName))
}

async function backupState(): Promise<BackupState> {
  const settings = await readBackupSettings(backupSettingsFile())
  const folder = await backupDir(settings)
  return { folder, defaultFolder: defaultBackupRoot(), settings, items: await listBackups(folder) }
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
      .then(async (settings) =>
        autoBackup(folder, projectName, await backupDir(settings), settings)
      )
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
    await trashTemplate(folder, file)
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

  ipcMain.handle('backup:list', () => backupState())
  ipcMain.handle('backup:create', async () => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    return createBackup(folder, projectName, await backupDir())
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

  // il renderer segue prefers-color-scheme, che Chromium ricava da themeSource
  ipcMain.on('theme:set', (_, theme: Theme) => {
    if (theme === 'system' || theme === 'light' || theme === 'dark') nativeTheme.themeSource = theme
  })
}

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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
