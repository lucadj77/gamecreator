import { app, shell, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { loadProject } from './project/load'
import { saveTemplate } from './project/templates'
import {
  getProjectFolder,
  handleAssetProtocol,
  registerAssetScheme,
  setProjectFolder
} from './protocol'
import { MessageError, msg } from '../shared/messages'
import type { Template } from '../shared/model/template'

registerAssetScheme()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'GameCreator',
    ...(process.platform === 'linux' ? { icon } : {}),
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
    return project
  })

  // si scrive solo nel progetto aperto, qualunque cartella arrivi dal renderer
  ipcMain.handle('template:save', async (_, template: Template) => {
    const folder = getProjectFolder()
    if (!folder) throw new MessageError(msg('template.noProject'))
    await saveTemplate(folder, template)
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.gamecreator.app')

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
