// Browser senza accesso alle cartelle (Firefox, Safari): Stella non può aprire i progetti

export function showUnsupported(): void {
  const it = navigator.language.toLowerCase().startsWith('it')
  const root = document.getElementById('root')!
  root.innerHTML = `
    <div class="unsupported">
      <h1>Stella</h1>
      <p>${
        it
          ? 'Questo browser non permette ai siti di aprire e salvare le cartelle del computer, e Stella lavora sui file dei progetti. Apri questa pagina con Chrome, Edge o Opera, oppure installa la versione desktop. In Brave la funzione è presente ma spenta: attivala in brave://flags/#file-system-access-api e riavvia Brave.'
          : 'This browser does not let websites open and save folders on your computer, and Stella works on project files. Open this page in Chrome, Edge or Opera, or install the desktop app. Brave has it turned off: turn it on in brave://flags/#file-system-access-api and restart Brave.'
      }</p>
      <p><a href="https://github.com/lucadj77/stella/releases">${
        it ? 'Scarica la versione desktop' : 'Download the desktop app'
      }</a></p>
    </div>`
}
