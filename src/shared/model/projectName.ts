/**
 * Nome della cartella di un progetto nuovo: il nome scritto dall'utente senza i caratteri che
 * Windows e macOS non accettano nei nomi di file. '' se non resta nulla di usabile.
 */
export function projectFolderName(name: string): string {
  const clean = name
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  return clean === '.' || clean === '..' ? '' : clean
}
