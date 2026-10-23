// Il controllo degli aggiornamenti chiesto a mano: UpdateNotice lo ascolta e mostra il risultato

export const CHECK_EVENT = 'stella:check-update'

/** Controlla subito se c'è una versione nuova e mostra il risultato nell'avviso */
export function checkForUpdateNow(): void {
  window.dispatchEvent(new Event(CHECK_EVENT))
}
