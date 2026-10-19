# Naibi

App desktop per creare carte e altri elementi di gioco a partire da fogli di calcolo. Funziona su file locali.

Il nome viene da _naibi_, la parola con cui nel Trecento si chiamavano in Italia le carte da gioco, dall'arabo _nā'ib_ ("luogotenente"), una delle figure dei mazzi mamelucchi. L'app prima si chiamava GameCreator: i progetti con `gamecreator.json` si aprono ancora.

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

Per provare, apri la cartella `examples/demo`. Il comando `naibi` e la skill per gli agenti IA sono descritti in [docs/cli.md](docs/cli.md). Il formato è descritto in [docs/formato.md](docs/formato.md).

## Build

```bash
npm run build:mac    # oppure build:win, build:linux
```

## Stack

Electron, React e TypeScript con electron-vite. Electron è stato scelto rispetto a Tauri perché include Chromium e garantisce lo stesso rendering di carte e PDF su tutti i sistemi operativi.
