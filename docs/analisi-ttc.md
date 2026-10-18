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

## Conseguenze per GameCreator

1. **I set sono già tabelle.** Righe = carte, colonne = `amount` più un campo per ogni pannello sostituibile (`punteggio`, `costo.color`, ...). Il foglio di calcolo può quindi essere la sorgente dati nativa, e l'import TTC si riduce a convertire ogni set in un foglio.
2. **L'import TTC è fattibile senza reverse engineering**: tutto è JSON. Le parti non replicabili sono le icone della libreria interna di TTC (vanno sostituite con set liberi, per esempio Kenney che è CC0, già presente nella cartella giochi) e i font, che vanno recuperati da Google Fonts o dal sistema.
3. **Unità in mm ovunque**, così anteprima e PDF restano coerenti; i pixel si calcolano solo in esportazione dal DPI scelto.

## Proposta di formato GameCreator (prima bozza)

```
progetto/
  gamecreator.json      # versione, nome, impostazioni di export, variabili
  templates/<nome>.json # come i blueprint TTC, con numeri veri e chiavi in inglese
  data/<nome>.xlsx      # un foglio per set; oppure .csv/.ods
  assets/
```

- Il collegamento tra set e template sta in `gamecreator.json`: `{ "set": "obiettivi", "template": "obiettivo", "source": "data/obiettivi.xlsx", "sheet": "Foglio1" }`.
- Intestazioni di colonna: nome del pannello per il valore, `pannello.proprietà` per le altre proprietà (`costo.color`), `amount` per le copie.
- Le celle vuote lasciano il valore del template.

Punti da decidere: se tenere un file xlsx per set o un unico xlsx con un foglio per set; se supportare anche la scrittura nel formato TTC (export inverso) o solo l'import.
