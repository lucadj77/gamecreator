/// <reference types="vite/client" />

// Parti della File System Access API che TypeScript non descrive ancora (solo Chromium)

interface FileSystemPermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>
}

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
}

interface Window {
  showDirectoryPicker(options?: {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: FileSystemHandle | string
  }): Promise<FileSystemDirectoryHandle>
}

declare const __APP_VERSION__: string

// file inclusi nella build con ?asset, come in electron-vite (vedi assetFiles in vite.web.config.mts)
declare module '*?asset' {
  const src: string
  export default src
}
