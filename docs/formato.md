# Formato di progetto

Un progetto GameCreator è una cartella:

```
progetto/
  gamecreator.json      # nome, file dati, elenco dei set
  data/carte.xlsx       # un foglio per set (oppure un .csv per un solo set)
  templates/<nome>.json # i template delle carte
  assets/               # immagini, icone, font
```

## gamecreator.json

```json
{
  "formatVersion": 1,
  "name": "Demo",
  "dataFile": "data/carte.xlsx",
  "sets": [{ "name": "Personaggi", "template": "personaggio", "sheet": "Personaggi" }]
}
```

`sheet` è facoltativo: se manca si usa il foglio con lo stesso nome del set.

`styles` (facoltativo) contiene gli stili di testo del progetto, scritti con gli stessi attributi del markup (docs/specifica.md, 2.1). Gli stili `heading1`, `heading2` e `note` esistono sempre e si possono ridefinire qui. Finché non c'è l'editor degli stili si modificano a mano.

```json
"styles": {
  "keyword": "weight=800 color=#7A3FA0 smallcaps",
  "flavor": "italic size=90% color=#6B6255 center"
}
```

`export` (facoltativo) ricorda le opzioni dell'ultima esportazione, con una chiave per tipo: `images`, `pdf`, `tts`. La scrive l'app quando si esporta; i nomi delle opzioni sono in `src/shared/export.ts` e il loro significato in docs/specifica.md, sezione 9. La cartella `export/` del progetto contiene i file esportati e si può rigenerare.

## Fogli dati

- La prima riga contiene le intestazioni; ogni riga successiva è una carta.
- `amount` indica il numero di copie (1 se vuoto o assente).
- Un'intestazione con il nome di un pannello del template ne sostituisce il valore; `pannello.proprietà` sostituisce un'altra proprietà (per esempio `nome.color`).
- Le celle vuote lasciano il valore del template.

### Perché xlsx

Il file dati di riferimento resta `.xlsx`. È uno standard pubblico (ECMA-376, ISO/IEC 29500) ed è il formato letto e scritto meglio da Excel, Numbers, LibreOffice e Google Fogli. Inoltre tiene più set in un file, conserva le formule e non ha problemi di codifica o di separatore.

- `.csv` è supportato per un singolo set, ma non regge più fogli e su Excel dà problemi con accenti e separatore (virgola o punto e virgola a seconda della lingua di sistema).
- `.ods` (OpenDocument, ISO/IEC 26300) è aperto quanto xlsx, ma Excel lo gestisce peggio. Da aggiungere più avanti in lettura e scrittura.

## Template

Un file JSON per template in `templates/`. Le unità sono millimetri, la dimensione del testo è in punti. Ogni livello riporta solo le proprietà diverse dai default: l'elenco completo è in `src/shared/model/template.ts` e i default in `src/shared/model/normalize.ts`.

```json
{
  "name": "personaggio",
  "width": 63,
  "height": 88,
  "bleed": 3,
  "cornerRadius": 3,
  "front": [
    {
      "type": "text",
      "name": "nome",
      "x": 6,
      "y": 4.5,
      "w": 51,
      "h": 9.5,
      "size": 14,
      "weight": 800,
      "fit": "shrink"
    },
    { "type": "image", "name": "cover", "x": 4, "y": 15.5, "w": 55, "h": 31, "src": "{nome}" },
    {
      "type": "shape",
      "name": "banda",
      "x": 4,
      "y": 4,
      "w": 55,
      "h": 10.5,
      "radius": 2,
      "fill": "#2F5DA8"
    }
  ],
  "back": []
}
```

- Il primo livello dell'elenco è quello in cima.
- Tipi: `text`, `image`, `shape` (`rect`, `ellipse`, `polygon`, `star`, `line`, `path`), `group` (con `children`).
- La colonna con il nome del livello ne sostituisce il valore principale: il testo per `text`, il file per `image`, il riempimento per `shape`, la visibilità per `group`.
- In testi e nomi di file, `{campo}` prende il valore di quella colonna della stessa riga.

L'analisi del formato di Tabletop Creator da cui deriva questa struttura è in [analisi-ttc.md](analisi-ttc.md).
