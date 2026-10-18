import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Api } from '../shared/api'

const api: Api = {
  chooseProjectFolder: () => ipcRenderer.invoke('project:choose-folder'),
  loadProject: (folder) => ipcRenderer.invoke('project:load', folder),
  recentProjects: () => ipcRenderer.invoke('recent:list'),
  removeRecentProject: (folder) => ipcRenderer.invoke('recent:remove', folder),
  saveThumbnail: (template, context, onlyIfMissing) =>
    ipcRenderer.invoke('project:thumbnail', template, context, onlyIfMissing),
  defaultProjectsFolder: () => ipcRenderer.invoke('project:default-parent'),
  createProject: (name, parent) => ipcRenderer.invoke('project:create', name, parent),
  saveTemplate: (template) => ipcRenderer.invoke('template:save', template),
  saveData: (changes) => ipcRenderer.invoke('data:save', changes),
  setUiZoom: (factor) => webFrame.setZoomFactor(factor),
  setTheme: (theme) => ipcRenderer.send('theme:set', theme),
  runExport: (job, context) => ipcRenderer.invoke('export:run', job, context),
  cancelExport: () => ipcRenderer.send('export:cancel'),
  onExportProgress: (cb) => {
    const listener = (_: unknown, p: Parameters<typeof cb>[0]): void => cb(p)
    ipcRenderer.on('export:progress', listener)
    return () => ipcRenderer.removeListener('export:progress', listener)
  },
  chooseExportFolder: (current) => ipcRenderer.invoke('export:choose-folder', current),
  saveExportProfiles: (profiles) => ipcRenderer.invoke('export:save-profiles', profiles),
  defaultExportFolders: () => ipcRenderer.invoke('export:default-folders'),
  showFolder: (path) => ipcRenderer.invoke('shell:show-folder', path),
  iconCatalog: (collection) => ipcRenderer.invoke('library:icon-catalog', collection),
  importIcons: (collection, items) => ipcRenderer.invoke('library:import-icons', collection, items),
  fontCatalog: () => ipcRenderer.invoke('library:font-catalog'),
  downloadFont: (family, variants) => ipcRenderer.invoke('library:download-font', family, variants),
  saveCredits: (text) => ipcRenderer.invoke('library:save-credits', text),
  chooseFolder: (current) => ipcRenderer.invoke('folder:choose', current),
  defaultTtcTarget: (source) => ipcRenderer.invoke('ttc:default-target', source),
  importTtc: (options) => ipcRenderer.invoke('ttc:import', options),
  exportPage: {
    onContext: (cb) => ipcRenderer.on('export:context', (_, c) => cb(c)),
    onScene: (cb) => ipcRenderer.on('export:scene', (_, id, scene) => cb(id, scene)),
    ready: () => ipcRenderer.send('export:page-ready'),
    shown: (id, error) => ipcRenderer.send('export:shown', id, error)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
