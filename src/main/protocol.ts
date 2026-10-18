import { net, protocol } from 'electron'
import { resolve, sep } from 'path'
import { pathToFileURL } from 'url'

// Le immagini del progetto si caricano come gc-asset://project/<percorso sotto assets/>

export const ASSET_SCHEME = 'gc-asset'

let projectFolder: string | null = null

export function setProjectFolder(folder: string): void {
  projectFolder = folder
}

export function getProjectFolder(): string | null {
  return projectFolder
}

export function registerAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: ASSET_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ])
}

export function handleAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, (request) => {
    if (!projectFolder) return new Response('No project', { status: 404 })
    const root = resolve(projectFolder, 'assets')
    const rel = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '')
    const file = resolve(root, rel)
    // niente uscite dalla cartella assets con ../
    if (!file.startsWith(root + sep)) return new Response('Forbidden', { status: 403 })
    return net.fetch(pathToFileURL(file).toString())
  })
}
