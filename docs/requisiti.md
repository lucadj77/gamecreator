# Requisiti

Richieste di Luca raccolte durante la pianificazione (ottobre 2026), con le scelte di progetto che ne derivano.

## Template a livelli, sul modello di Affinity

- Ogni template è un albero di livelli: testo, immagine, forma, gruppo. I gruppi possono contenere altri gruppi.
- Ogni livello si può selezionare, spostare, ridimensionare e ruotare con le maniglie, singolarmente o in selezione multipla.
- Le forme sono più flessibili dei pannelli procedurali di TTC: rettangolo con raggi, ellisse, poligono, tracciato libero, con riempimento e contorno.
- Ogni livello ha visibilità, blocco, opacità e un nome univoco, che è anche il nome della colonna nel foglio dati.

Scelta: l'anteprima è renderizzata in SVG/DOM, non su canvas. In questo modo l'esportazione PDF usa lo stesso motore di Chromium dell'anteprima, resta vettoriale e coincide con ciò che si vede a schermo.

## Modifica delle carte

- Le carte si modificano in due modi equivalenti: dalla tabella del set oppure aprendo la carta e lavorandoci direttamente, come in TTC. Ogni modifica sulla carta aggiorna la riga corrispondente.
- Il salvataggio riscrive il file xlsx del progetto.

Rischio da verificare: la riscrittura dell'xlsx con exceljs può perdere parte della formattazione del file (formattazione condizionale, grafici). I dati e le formule restano.

## Colonne della tabella

- Per ogni livello è visibile di base solo la colonna del valore (per esempio `nome`), con un pulsante + accanto all'intestazione.
- Il + mostra le colonne delle altre proprietà dello stesso livello (`nome.color`, `nome.size`, ...); un secondo clic le nasconde.

## Campi calcolati

- Un campo può essere calcolato dagli altri campi della stessa carta, per esempio `energia = {forza} + 2`.
- Un campo immagine può comporre il nome del file o della variabile da altri campi, per esempio `cover = {nome}.png`, che per la carta Cavaliere diventa `Cavaliere.png`.

Scelta (rivista il 2026-10-18 su richiesta di Luca): la fonte del valore si imposta per livello nel template, con tre possibilità: colonna del foglio (di base quella con il nome del livello, ma se ne può indicare un'altra), valore fisso, formula. Una formula usa `{campo}` per i valori della riga e si calcola quando contiene + - * / e il risultato è numerico, altrimenti compone testo (`{nome}.png`). Le colonne delle altre proprietà (`nome.color`) valgono qualunque sia la fonte. Le formule di Excel restano utilizzabili nel foglio: l'app ne legge il risultato.

## Dopo la prima versione funzionante

Richieste da affrontare quando l'app copre già il flusso base (template, carte, esportazione, import da TTC).

- Importazione di icone negli asset da game-icons.net e da altri repository liberi, con ricerca dall'app. L'icona scaricata va in `assets/` con il nome e i dati di licenza e attribuzione richiesti dalla fonte (game-icons.net usa CC BY 3.0, che chiede di citare l'autore).
- Accesso agevole ai font Google: ricerca e anteprima dall'app, con scaricamento dei file in `assets/fonts/` così che il progetto funzioni anche senza rete e l'esportazione usi gli stessi font.
