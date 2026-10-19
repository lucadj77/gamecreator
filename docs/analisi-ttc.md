# Specifica del formato

Analisi basata su tre progetti di Luca creati con Tabletop Creator 2026.9 (Pro): assedio (12 blueprint, 39 carte), PortaPortese (4 blueprint, 62 carte), mesh (3 blueprint, 77 carte).

## Il formato di Tabletop Creator

Un progetto TTC è una cartella di file JSON leggibili, senza formati binari.

```
progetto/
  progetto.tcp          # solo un marcatore, nessun dato
  data/
    project.json        # nome, versione app, date
    blueprints/<uuid>.json   # i template delle carte
    sets/<uuid>.json         # le carte vere e proprie
    variables.json      # sostituzioni {codice} -> icona colorata
    export.json         # impostazioni di esportazione PDF/immagini/TTS
    workspace.json      # preferenze dell'interfaccia
  assets/
    images/ icons/ fonts/
  temp/ backups/ output/   # generati dall'app
```

### Blueprint (template)

- Dimensioni in mm (`layout_size_mm`, es. `63, 88`), abbondanza (`bleeding_size_mm`), raggio degli angoli (`shape_settings.radius`).
- Fronte e retro sono liste di gruppi, ogni gruppo è una lista di pannelli. L'ordine definisce la sovrapposizione: il primo è in cima.
- Tre tipi di pannello, tutti con posizione, dimensione e rotazione in mm:
  - `text`: valore con segnaposto `{codice}`, font, dimensione, spaziature di riga, carattere e paragrafo, allineamento, grassetto, dimensione automatica con minimo e massimo;
  - `image`: nome dell'immagine, modalità di adattamento, zoom, specchiatura, ombra;
  - `procedural`: rettangoli con colore, bordo e raggio.
- Altri attributi: `visible`, `panel_editable`, vincoli di posizione (`layout_constraint_h/v`), colori RGBA esadecimali (`#RRGGBBAA`).
- I valori numerici sono salvati come stringhe (`"14.8"`, `"True"`).

### Set (carte)

Un set usa un blueprint ed è una lista di carte. Ogni carta ha `amount` (copie) e `details`: una lista di sostituzioni per nome di pannello (`value`, `color`, a volte `img_flip_h/v`). Un pannello non elencato mantiene il valore del blueprint.

### Variabili

`{codice}` dentro un testo viene sostituito da un'icona, eventualmente ricolorata (`force_tint`, `color`). Le icone possono essere file del progetto (`assets/icons`) o della libreria interna di TTC (`Star/round-star`, `Board-Kenney/...`).

## Conseguenze per Naibi

1. **I set sono già tabelle.** Righe = carte, colonne = `amount` più un campo per ogni pannello sostituibile (`punteggio`, `costo.color`, ...). Il foglio di calcolo può quindi essere la sorgente dati nativa, e l'import TTC si riduce a convertire ogni set in un foglio.
2. **L'import TTC è fattibile senza reverse engineering**: tutto è JSON. Le parti non replicabili sono le icone della libreria interna di TTC (vanno sostituite con set liberi, per esempio Kenney che è CC0, già presente nella cartella giochi) e i font, che vanno recuperati da Google Fonts o dal sistema.
3. **Unità in mm ovunque**, così anteprima e PDF restano coerenti; i pixel si calcolano solo in esportazione dal DPI scelto.

## Proposta di formato Naibi (prima bozza)

```
progetto/
  naibi.json      # versione, nome, impostazioni di export, variabili
  templates/<nome>.json # come i blueprint TTC, con numeri veri e chiavi in inglese
  data/<nome>.xlsx      # un foglio per set; oppure .csv/.ods
  assets/
```

- Il collegamento tra set e template sta in `naibi.json`: `{ "set": "obiettivi", "template": "obiettivo", "source": "data/obiettivi.xlsx", "sheet": "Foglio1" }`.
- Intestazioni di colonna: nome del pannello per il valore, `pannello.proprietà` per le altre proprietà (`costo.color`), `amount` per le copie.
- Le celle vuote lasciano il valore del template.

Punti da decidere: se tenere un file xlsx per set o un unico xlsx con un foglio per set; se supportare anche la scrittura nel formato TTC (export inverso) o solo l'import.

## Importazione in Naibi

Il comando "Importa…" della barra in alto converte un progetto Tabletop Creator in una cartella nuova; la cartella di origine si legge soltanto. Codice: `src/shared/import/ttc.ts` (conversione dei dati), `src/shared/import/richText.ts` (testo formattato), `src/main/import/ttc.ts` (lettura e scrittura dei file).

### Cosa si converte

| Tabletop Creator                         | Naibi                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| blueprint                                | template, con dimensioni, abbondanza, raggio degli angoli e campo che dà il nome alle carte                    |
| gruppo di pannelli                       | livello gruppo                                                                                                 |
| pannello testo                           | livello testo: carattere, dimensione, grassetto, colore, allineamenti, interlinea, spaziatura, contorno        |
| dimensione automatica                    | "riduci per stare nel riquadro", con dimensione massima e minima                                               |
| pannello immagine e icona                | livello immagine: adattamento, zoom, spostamento, ribaltamento, tinta, raggio, ombra                           |
| pannello procedurale                     | livello forma (rettangolo, ellisse, poligono, stella), con riempimento e bordo                                 |
| pannello valore                          | livello valore                                                                                                 |
| set                                      | foglio del file `data/cards.xlsx`, con la colonna `amount` e una colonna per proprietà cambiata (`layer.prop`) |
| variabile con immagine                   | variabile immagine, con tinta e dimensione; le icone della libreria vanno in `assets/library/<categoria>/`     |
| variabile con testo                      | variabile di testo                                                                                             |
| tag `<b>`, `<i>`, `<color>`, `<size>`... | markup (docs/specifica.md, 2.1)                                                                                |

La posizione di Tabletop Creator è il riquadro che contiene il pannello ruotato: si converte nel riquadro del livello ruotato intorno al centro. Le icone `{nome}` che non sono variabili diventano variabili immagine con il colore del testo, come in Tabletop Creator.

### Cosa non si converte

Finisce nelle note mostrate a fine importazione:

- testo senza a capo (va a capo), adattamento alla sola larghezza o altezza (diventa "adatta dentro");
- maschere, immagini a 9 sezioni, raggi diversi per angolo;
- arrotondamento degli angoli dei poligoni e bordi sfumati delle forme;
- carte non rettangolari (importate come rettangoli);
- tag del testo senza equivalente e valori delle carte per proprietà non supportate.

Le icone della libreria interna di Tabletop Creator non sono nel progetto, che le richiama come `Categoria/nome`. Quelle di game-icons.net (categorie come `Shield`, `Gui`, `Star`) e delle Board Game Icons di Kenney (`Board-Kenney`) si prendono per nome dai cataloghi dell'app e si scrivono in `assets/library/<categoria>/<nome>.svg`, con autore e licenza in `assets/sources.json`, così compaiono nei crediti. Le altre (per esempio `Board-Info-Kenney`, il pacchetto Board Game Info che l'app non include, o il logo di Tabletop Creator) si cercano per nome nella cartella delle icone indicata nel dialogo; quelle non trovate compaiono come un quadrato tratteggiato. I caratteri usati si elencano a fine importazione: Nunito è incluso nell'app, gli altri vanno installati nel sistema.
