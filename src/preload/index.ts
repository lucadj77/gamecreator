import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Api } from '../shared/api'

const api: Api = {
  chooseProjectFolder: () => ipcRenderer.invoke('project:choose-folder'),
  loadProject: (folder) => ipcRenderer.invoke('project:load', folder),
  saveTemplate: (template) => ipcRenderer.invoke('template:save', template),
  setUiZoom: (factor) => webFrame.setZoomFactor(factor)
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
