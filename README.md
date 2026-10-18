# GameCreator

App desktop per creare carte e altri elementi di gioco a partire da fogli di calcolo, ispirata a Tabletop Creator. Funziona su file locali.

Stato: prima base. Apre una cartella di progetto e mostra le carte di ogni set lette dal file dati.

Prossimi passi:

1. editor dei template a livelli (testo, immagine, forma, gruppi), con anteprima delle carte;
2. modifica delle carte da tabella o direttamente sulla carta, colonne espandibili, campi calcolati;
3. esportazione PNG e PDF di stampa;
4. import dei progetti Tabletop Creator.

I requisiti sono in [docs/requisiti.md](docs/requisiti.md).

## Sviluppo

```bash
npm install
npm run dev
```

Per provare, apri la cartella `examples/demo`. Il formato è descritto in [docs/formato.md](docs/formato.md).

## Build

```bash
npm run build:mac    # oppure build:win, build:linux
```

## Stack

Electron, React e TypeScript con electron-vite. Electron è stato scelto rispetto a Tauri perché include Chromium e garantisce lo stesso rendering di carte e PDF su tutti i sistemi operativi.
