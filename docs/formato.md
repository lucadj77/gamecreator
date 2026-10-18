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

## Fogli dati

- La prima riga contiene le intestazioni; ogni riga successiva è una carta.
- `amount` indica il numero di copie (1 se vuoto o assente).
- Un'intestazione con il nome di un pannello del template ne sostituisce il valore; `pannello.proprietà` sostituisce un'altra proprietà (per esempio `nome.color`).
- Le celle vuote lasciano il valore del template.

## Template

Struttura in definizione (passo 3). Le unità sono millimetri.

L'analisi del formato di Tabletop Creator da cui deriva questa struttura è in [analisi-ttc.md](analisi-ttc.md).
