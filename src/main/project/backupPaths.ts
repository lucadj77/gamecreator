import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { backupDirName, projectBackupDir, readBackupSettings } from './backup'
import type { BackupSettings } from '../../shared/api'

// Dove stanno i backup: impostazioni nei dati dell'app, cartella di base scelta dall'utente
// (o Documenti/Stella/Backup), una sottocartella per progetto. Usato dall'app e dal comando stella.

export const backupSettingsFile = (): string =>
  join(app.getPath('userData'), 'backup-settings.json')
export const defaultBackupRoot = (): string => {
  const root = join(app.getPath('documents'), 'Stella', 'Backup')
  // i backup fatti quando l'app si chiamava Naibi restano dove sono, e quelli nuovi li seguono
  const old = join(app.getPath('documents'), 'Naibi', 'Backup')
  return !existsSync(root) && existsSync(old) ? old : root
}

/** Cartella dei backup del progetto aperto, con le impostazioni lette se non date */
export async function backupDirFor(
  folder: string,
  projectName: string,
  settings?: BackupSettings
): Promise<{ dir: string; settings: BackupSettings }> {
  const s = settings ?? (await readBackupSettings(backupSettingsFile()))
  const root = s.folder || defaultBackupRoot()
  return { dir: await projectBackupDir(root, backupDirName(projectName), folder), settings: s }
}
