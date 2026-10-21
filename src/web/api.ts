import { mkdir, writeFile } from './shims/fs'
import { join } from './shims/path'
import type { Api } from '../shared/api'
import type { ExportProgress } from '../shared/export'
import { MessageError, msg } from '../shared/messages'
import { loadProject } from '../main/project/load'
import { saveTemplate, trashTemplate } from '../main/project/templates'
import { createProject } from '../main/project/create'
import { saveData } from '../main/project/save'
import { saveExportProfiles } from '../main/project/exportProfiles'
import { runExport } from '../main/export/run'
import { ensurePermission, pickFolder } from './fs/roots'
import { assetUrl, openAssets } from './assets'
import { addRecent, hasThumbnail, listRecent, removeRecent, saveThumbnail } from './recent'
import { FrameWindow, exportPageApi } from './exportFrame'

// window.api nella versione web: le stesse funzioni dell'app desktop (src/preload), fatte nel
// browser. Il codice dei progetti è quello di src/main/project, che qui legge e scrive i file
// attraverso shims/fs.ts. Ciò che il browser non può fare resta solo nell'app desktop.

let folder: string | null = null
/** Modifiche non salvate nel progetto aperto: il browser avvisa prima di chiudere la scheda */
let dirty = false
let cancelled = false
const progressListeners = new Set<(p: ExportProgress) => void>()

addEventListener('beforeunload', (e) => {
  if (dirty) e.preventDefault()
})

function projectFolder(): string {
  if (!folder) throw new MessageError(msg('template.noProject'))
  return folder
}

const desktopOnly = (): Promise<never> => Promise.reject(new MessageError(msg('web.desktopOnly')))

export const webApi: Api = {
  isWeb: true,
  assetUrl,
  chooseProjectFolder: () => pickFolder('naibi-project'),
  recentProjects: () => listRecent(),
  removeRecentProject: (f) => removeRecent(f),
  saveThumbnail: async (template, context, onlyIfMissing) => {
    const f = folder
    if (!f || (onlyIfMissing && (await hasThumbnail(f)))) return
    await saveThumbnail(f, template, context)
  },
  defaultProjectsFolder: async () => '',
  createProject: async (name, parent, data) => {
    if (!parent) throw new MessageError(msg('web.chooseParent'))
    if (!(await ensurePermission(parent))) throw new MessageError(msg('web.permissionDenied'))
    return createProject(name, parent, data)
  },
  loadProject: async (f) => {
    // il browser chiede il permesso sulla cartella a ogni sessione
    if (!(await ensurePermission(f))) throw new MessageError(msg('web.permissionDenied'))
    const project = await loadProject(f)
    await openAssets(f)
    folder = f
    await addRecent(f, project.file.name).catch((e) => console.error(e))
    return project
  },
  saveTemplate: (template) => saveTemplate(projectFolder(), template),
  deleteTemplate: (file) => trashTemplate(projectFolder(), file),
  saveData: (changes) => saveData(projectFolder(), changes),
  // l'ingrandimento è quello del browser (Ctrl + e Ctrl −)
  setUiZoom: () => undefined,
  setTheme: () => undefined,
  runExport: (job, context) => {
    cancelled = false
    return runExport(job, {
      openWindow: (c) => FrameWindow.open(c),
      projectFolder: projectFolder(),
      platform: 'web',
      home: '',
      documents: '',
      context,
      onProgress: (p) => progressListeners.forEach((l) => l(p)),
      isCancelled: () => cancelled
    })
  },
  cancelExport: () => {
    cancelled = true
  },
  onExportProgress: (cb) => {
    progressListeners.add(cb)
    return () => progressListeners.delete(cb)
  },
  chooseExportFolder: () => pickFolder('naibi-export'),
  saveExportProfiles: async (profiles) => {
    if (folder) await saveExportProfiles(folder, profiles)
  },
  defaultExportFolders: async () => ({ export: folder ? join(folder, 'export') : '', tts: '' }),
  showFolder: async () => '',
  iconCatalog: desktopOnly,
  importIcons: desktopOnly,
  updateCatalog: desktopOnly,
  iconifyCollections: desktopOnly,
  iconifyCollection: desktopOnly,
  iconifySearch: desktopOnly,
  iconifySvgs: desktopOnly,
  importIconifyIcons: desktopOnly,
  fontCatalog: desktopOnly,
  downloadFont: desktopOnly,
  systemFonts: desktopOnly,
  copySystemFont: desktopOnly,
  saveCredits: async (text) => {
    const dir = join(projectFolder(), 'export')
    await mkdir(dir, { recursive: true })
    const file = join(dir, 'credits.txt')
    await writeFile(file, text)
    return file
  },
  chooseFolder: () => pickFolder('naibi-folder'),
  backups: desktopOnly,
  createBackup: desktopOnly,
  saveBackupSettings: desktopOnly,
  restoreBackup: desktopOnly,
  defaultTtcTarget: desktopOnly,
  importTtc: desktopOnly,
  naibiCommand: desktopOnly,
  // chi apre il sito ha sempre l'ultima versione
  checkForUpdate: async () => null,
  appVersion: async () => __APP_VERSION__,
  saveSkill: desktopOnly,
  skillsFolder: desktopOnly,
  setAppState: async (f, d) => {
    dirty = !!f && d
  },
  onAgentLock: () => () => undefined,
  unlockAgent: async () => undefined,
  exportPage: exportPageApi() ?? {
    onContext: () => undefined,
    onScene: () => undefined,
    ready: () => undefined,
    shown: () => undefined,
    alive: () => undefined
  }
}
