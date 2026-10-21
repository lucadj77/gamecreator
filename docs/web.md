# Versione web

La versione web è la stessa app nel browser, senza installazione: serve dove un programma non si
può installare o avviare, per esempio sui computer aziendali che bloccano i file .exe non firmati.
Lavora sulle cartelle dei progetti del computer come l'app desktop, e i progetti sono gli stessi
file. È pubblicata su GitHub Pages: <https://lucadj77.github.io/naibi/>.

## Browser

Serve la File System Access API, che c'è solo nei browser basati su Chromium: Chrome, Edge, Opera.
Brave la tiene spenta: si attiva in `brave://flags/#file-system-access-api` e si riavvia Brave.
Firefox, Safari e Brave senza l'impostazione mostrano una pagina che lo spiega. Il permesso sulla cartella del progetto
si chiede a ogni sessione: il browser lo domanda quando si apre il progetto.

## Cosa manca rispetto all'app desktop

L'elenco è anche nell'app, nella voce **Cosa ha in più la versione desktop** in fondo alla
schermata iniziale (`src/renderer/src/components/DesktopFeaturesDialog.tsx`): quando una funzione
arriva nel web va tolta da lì.

- PDF: le pagine vanno alla finestra di stampa del browser, da cui si sceglie "Salva come PDF"
  (margini nessuno, grafica di sfondo attiva). Niente CMYK.
- Immagini PNG, JPG e WebP: si ottengono dall'SVG della carta (lo stesso dell'esportazione in SVG)
  disegnato su un canvas, non da una cattura della pagina. Il risultato può differire di poco
  nella posizione delle lettere.
- Non ci sono: Tabletop Simulator, librerie di icone e Google Fonts, font del computer, backup,
  importazione da Tabletop Creator, comando `naibi` e skill per gli agenti IA, controllo degli
  aggiornamenti (il sito è sempre all'ultima versione), dimensione dell'interfaccia (si usa lo
  zoom del browser).
- Le immagini si aggiungono copiandole in `assets/` con il file manager del sistema e premendo
  **Ricarica**.

## Come funziona

- `src/web/main.ts` crea `window.api` (`src/web/api.ts`) e avvia la stessa interfaccia di
  `src/renderer`. Le differenze nell'interfaccia passano da `window.api.isWeb`.
- Il codice dei progetti è quello di `src/main/project`: in `vite.web.config.mts` i moduli
  `fs/promises`, `path`, `zlib` e `url` di Node sono sostituiti dagli shims in `src/web/shims`, che
  lavorano sulla File System Access API.
- Ogni cartella scelta diventa un percorso virtuale `/<nome della cartella>`
  (`src/web/fs/roots.ts`). Le cartelle autorizzate e i progetti recenti stanno nell'IndexedDB del
  browser.
- Immagini e font del progetto si caricano come URL `blob:` (`src/web/assets.ts`) al posto del
  protocollo `gc-asset://`.
- Le esportazioni usano `src/main/export/run.ts` con un iframe invisibile al posto della finestra
  nascosta di Electron (`src/web/exportFrame.ts`).

## Sviluppo e pubblicazione

```bash
npm run dev:web      # server di sviluppo
npm run build:web    # build in out/web
npm run preview:web  # prova della build
```

L'azione **Web** (`.github/workflows/web.yml`) costruisce la versione web sulle PR e la pubblica
su GitHub Pages a ogni tag `v*`, insieme alla release, oppure a mano da Actions. La prima volta va
attivato **Settings → Pages → Source: GitHub Actions** nel repository.
