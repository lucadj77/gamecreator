# Stella

App desktop per creare carte e altri elementi di gioco a partire da fogli di calcolo. Funziona su file locali.

L'app prima si chiamava Naibi e, ancora prima, GameCreator: i progetti con `naibi.json` o `gamecreator.json` si aprono ancora.

Stato: apre una cartella di progetto, legge template e fogli dati e disegna le carte di ogni set, in tabella con anteprima o in griglia. Interfaccia in inglese e italiano.

Prossimi passi:

1. editor dei template a livelli (testo, immagine, forma, gruppi);
2. modifica delle carte da tabella o direttamente sulla carta, colonne espandibili, campi calcolati;
3. esportazione PNG e PDF di stampa;
4. import dei progetti Tabletop Creator.

La guida all'uso è in [docs/guida](docs/guida/README.md) (in inglese in [docs/guide](docs/guide/README.md)).

I requisiti sono in [docs/requisiti.md](docs/requisiti.md), la specifica funzionale in [docs/specifica.md](docs/specifica.md).

## Sviluppo

```bash
npm install
npm run dev     # avvia l'app
npm test        # test
```

Per provare, apri la cartella `examples/demo`. Il comando `stella` e la skill per gli agenti IA sono descritti in [docs/cli.md](docs/cli.md). Il formato è descritto in [docs/formato.md](docs/formato.md).

## Installazione

I pacchetti si scaricano dalla pagina [Releases](https://github.com/lucadj77/stella/releases) o, per una build non ancora rilasciata, dagli artefatti dell'azione **Build** in [Actions](https://github.com/lucadj77/stella/actions/workflows/build.yml).

- **Mac**: `Stella-<versione>-mac-arm64.dmg` per i Mac con chip Apple (M1 e successivi), `-mac-x64.dmg` per quelli con processore Intel. Si apre il .dmg e si trascina Stella in Applicazioni. L'app non è firmata con un certificato Apple, quindi alla prima apertura macOS dice che non può verificarla: si chiude l'avviso, si apre **Impostazioni di Sistema → Privacy e sicurezza** e in fondo si preme **Apri comunque**. In alternativa, da Terminale: `xattr -dr com.apple.quarantine /Applications/Stella.app`. Serve solo la prima volta.
- **Windows**: `Stella-<versione>-windows-setup.exe`. Senza firma, Windows SmartScreen mostra "Windows ha protetto il PC": si preme **Ulteriori informazioni** e poi **Esegui comunque**. Per la versione portable, che non si installa, c'è `Stella-<versione>-windows-portable.exe`: si avvia direttamente, anche da una chiavetta, e tiene i suoi dati (progetti recenti, preferenze) nella cartella `Stella data` accanto al file.
- **Linux**: `Stella-<versione>-linux-x86_64.AppImage`, da rendere eseguibile (`chmod +x`) e avviare, oppure `Stella-<versione>-linux-amd64.deb` per Debian e Ubuntu (per esempio `sudo apt install ./Stella-1.0.0-linux-amd64.deb`). L'AppImage richiede libfuse2 (su Ubuntu `sudo apt install libfuse2t64`).

Dove non si può installare nulla c'è la **versione web**, da aprire con Chrome, Edge o Opera (in Brave va attivata `brave://flags/#file-system-access-api`): <https://lucadj77.github.io/stella/>. Lavora sugli stessi progetti, con alcune funzioni in meno; vedi [docs/web.md](docs/web.md).

## Build

```bash
npm run build:mac    # oppure build:win, build:linux; i pacchetti vanno in dist/
```

Ogni sistema costruisce bene solo i propri pacchetti (il .dmg richiede un Mac, l'installer Windows richiede Windows o Wine). Per averli tutti insieme c'è l'azione **Build** di GitHub: si avvia a mano da Actions, oppure si crea un tag (`git tag v1.0.0 && git push origin v1.0.0`) e i pacchetti finiscono in una release pubblica, scaricabile da chiunque anche senza account GitHub. La versione è quella di `package.json` e le novità sono in [CHANGELOG.md](CHANGELOG.md): la procedura completa è in [docs/rilascio.md](docs/rilascio.md).

## Licenza

Stella è software libero, distribuito con la licenza [GNU GPL versione 3 o successive](LICENSE): si può usare, studiare, modificare e ridistribuire, anche con modifiche, a patto che le versioni ridistribuite restino sotto la stessa licenza e con il codice sorgente disponibile. Le carte e gli altri file creati con Stella appartengono a chi li crea e non sono vincolati dalla licenza. Icone, font e librerie inclusi hanno le loro licenze, elencate in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

_English_: Stella is free software, licensed under the [GNU GPL version 3 or later](LICENSE). Cards and other files made with Stella belong to their authors and are not covered by this license. Bundled icons, fonts and libraries keep their own licenses, listed in [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Stack

Electron, React e TypeScript con electron-vite. Electron è stato scelto rispetto a Tauri perché include Chromium e garantisce lo stesso rendering di carte e PDF su tutti i sistemi operativi.
