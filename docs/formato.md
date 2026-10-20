# Formato di progetto

Un progetto Naibi è una cartella:

```
progetto/
  naibi.json      # nome, file dati, elenco dei set
  data/carte.xlsx       # un foglio per set (oppure un .csv per un solo set)
  templates/<nome>.json # i template delle carte
  assets/               # immagini e icone
  assets/icons/         # icone importate da game-icons.net
  assets/fonts/         # font del progetto (ttf, otf, woff, woff2)
  assets/sources.json   # provenienza e licenza dei file importati dall'app
```

`assets/sources.json` si scrive quando si importano icone o si scaricano font dall'app: per ogni file (percorso relativo ad `assets/`) indica tipo (`icon` o `font`), fonte, identificativo, autore, licenza in forma SPDX (`CC-BY-3.0`, `OFL-1.1`…), indirizzo e data di importazione. Serve a comporre i crediti; le voci dei file che non esistono più si tolgono alla scrittura successiva. I file aggiunti a mano non compaiono.

```json
{
  "icons/spada.svg": {
    "kind": "icon",
    "source": "game-icons.net",
    "id": "lorc/broadsword",
    "title": "broadsword",
    "author": "Lorc",
    "license": "CC-BY-3.0",
    "url": "https://game-icons.net/1x1/lorc/broadsword.html",
    "imported": "2026-10-18"
  }
}
```

## naibi.json

I progetti creati quando l'app si chiamava GameCreator hanno `gamecreator.json`: si aprono come gli altri e continuano a salvare in quel file. Se una cartella li ha entrambi vale `naibi.json`.

```json
{
  "formatVersion": 1,
  "name": "Demo",
  "dataFile": "data/carte.xlsx",
  "sets": [{ "name": "Personaggi", "template": "personaggio", "sheet": "Personaggi" }]
}
```

`sheet` è facoltativo: se manca si usa il foglio con lo stesso nome del set. `hiddenColumns` (facoltativo) elenca le colonne nascoste nella tabella e nei campi della carta; `showComputed: true` mostra anche i livelli fissi e con formula, in sola lettura. Sono solo preferenze di vista: non cambiano le carte.

`styles` (facoltativo) contiene gli stili di testo del progetto, scritti con gli stessi attributi del markup (docs/specifica.md, 2.1). Gli stili `heading1`, `heading2` e `note` esistono sempre e si possono ridefinire qui. Finché non c'è l'editor degli stili si modificano a mano.

```json
"styles": {
  "keyword": "weight=800 color=#7A3FA0 smallcaps",
  "flavor": "italic size=90% color=#6B6255 center"
}
```

`variables` (facoltativo) contiene le variabili del progetto (docs/specifica.md, 6.1), una per nome, con un campo `type`:

```json
"variables": {
  "spada": { "type": "image", "src": "spada", "tint": "rosso", "scale": 1.2, "raise": 10 },
  "pino": { "type": "text", "text": "[pino]{color=green weight=700}" },
  "rosso": { "type": "color", "color": "#A33A2A" },
  "mano": { "type": "value", "value": "7" }
}
```

- `image`: `src` è il nome di un file in `assets/`; `tint` (facoltativo) ricolora l'icona; `scale` è l'altezza rispetto alle icone normali nel testo (1 = normale); `raise` sposta l'icona in alto, in % della riga; `rotate` (gradi, senso orario), `flip` (`h`, `v`, `hv`) e `opacity` (0-1) sono facoltativi.
- `text`: testo con markup che prende il posto di `{nome}`.
- `color`: un colore usabile per nome in ogni proprietà colore; un nome standard (`red`) ridefinito qui cambia in tutto il progetto.
- `value`: testo o numero costante, usabile nei testi e nelle formule.

Un campo della carta con lo stesso nome di una variabile vince sulla variabile.

`export` (facoltativo) ricorda le opzioni dell'ultima esportazione, con una chiave per tipo: `images`, `pdf`, `tts`. La scrive l'app quando si esporta; i nomi delle opzioni sono in `src/shared/export.ts` e il loro significato in docs/specifica.md, sezione 9. Sotto `named` stanno i profili con nome, ciascuno con `name`, `kind` e `options`. La cartella `export/` del progetto contiene i file esportati e si può rigenerare.

`order` (facoltativo) ricorda l'ordine scelto a mano trascinando le voci della barra laterale, con una chiave per elenco: `templates`, `styles`, `variables`. Senza la chiave l'elenco è in ordine alfabetico; i nomi che non compaiono vanno in fondo, in ordine alfabetico. L'ordine dei set è quello di `sets`.

```json
"order": { "variables": ["spada", "scudo", "rosso"] }
```

## Fogli dati

- La prima riga contiene le intestazioni; ogni riga successiva è una carta.
- `amount` indica il numero di copie (1 se vuoto o assente).
- Un'intestazione con il nome di un pannello del template ne sostituisce il valore; `pannello.proprietà` sostituisce un'altra proprietà (per esempio `nome.color`).
- Le celle vuote lasciano il valore del template.

### Perché xlsx

Il file dati di riferimento resta `.xlsx`. È uno standard pubblico (ECMA-376, ISO/IEC 29500) ed è il formato letto e scritto meglio da Excel, Numbers, LibreOffice e Google Fogli. Inoltre tiene più set in un file, conserva le formule e non ha problemi di codifica o di separatore.

- `.csv` è supportato per un singolo set, ma non regge più fogli e su Excel dà problemi con accenti e separatore (virgola o punto e virgola a seconda della lingua di sistema).
- `.ods` (OpenDocument, ISO/IEC 26300) è aperto quanto xlsx e si legge e scrive come l'xlsx: più set in un file, e nel salvataggio si riscrivono solo le celle delle colonne con intestazione (le celle con lo stesso testo restano com'erano, con formule, formattazione e note). Excel però lo gestisce peggio, per questo il formato consigliato resta xlsx. Si sceglie alla creazione del progetto, o cambiando `dataFile` in `naibi.json`.

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

- Facoltativi: `shape` (`rect` di base, `ellipse`, `hexagon`, `path` con `shapePath`, tracciato SVG in coordinate 0–1 della carta) e `guides` (`{ "x": [mm...], "y": [mm...] }`, guide manuali dell'editor).
- Il primo livello dell'elenco è quello in cima.
- Tipi: `text`, `image`, `shape` (`rect`, `ellipse`, `polygon`, `star`, `line`, `path`), `group` (con `children`). Una `line` va dal centro del lato sinistro al centro del lato destro del suo riquadro, ruotato di `rotation`: `w` è la lunghezza. Un `path` ha in `path` il tracciato in coordinate 0–1 del riquadro, ricavato dalla sagoma di un'immagine.
- La colonna con il nome del livello ne sostituisce il valore principale: il testo per `text`, il file per `image`, il riempimento per `shape`, la visibilità per `group`.
- Un `group` con `layout` (`row`, `column`, `grid`) o con `repeat` diverso da 1 salva il proprio riquadro (`x`, `y`, `w`, `h`): i figli vi si dispongono dentro con `gap`, `columns`, `justify` e `alignItems` (`start`, `center`, `end`). `repeat` è un numero o un campo, come `"{forza}"`; le copie non si salvano.
- In testi e nomi di file, `{campo}` prende il valore di quella colonna della stessa riga.

L'analisi del formato di Tabletop Creator da cui deriva questa struttura è in [analisi-ttc.md](analisi-ttc.md).
