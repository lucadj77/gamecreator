/** Nome di una lingua nella lingua dell'interfaccia, con il codice: en → inglese (en) */
export function languageName(code: string, ui: string): string {
  try {
    const n = new Intl.DisplayNames([ui], { type: 'language' }).of(code)
    return n && n !== code ? `${n} (${code})` : code
  } catch {
    return code
  }
}
