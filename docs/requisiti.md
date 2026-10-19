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

Scelta (passo 5): nella tabella del set si modificano celle, righe (aggiungi, duplica, elimina, trascina per riordinare) e colonne; accanto all'anteprima c'è il modulo con i campi della carta selezionata, e un clic su un livello della carta porta al suo campo. Un solo comando Salva (⌘S) scrive template, fogli e `gamecreator.json`. Nell'xlsx si riscrivono solo le colonne con intestazione: formattazione delle celle, altri fogli e colonne senza intestazione restano; una cella con formula resta formula se il risultato non cambia. Le righe vuote in mezzo ai dati spariscono al salvataggio. Un set nuovo crea il suo foglio con le colonne dei testi, delle immagini e dei valori del template, oppure riprende un foglio non ancora collegato. Con un file dati CSV c'è un solo set.

## Colonne della tabella

- Per ogni livello è visibile di base solo la colonna del valore (per esempio `nome`), con un pulsante + accanto all'intestazione.
- Il + mostra le colonne delle altre proprietà dello stesso livello (`nome.color`, `nome.size`, ...); un secondo clic le nasconde.

## Campi calcolati

- Un campo può essere calcolato dagli altri campi della stessa carta, per esempio `energia = {forza} + 2`.
- Un campo immagine può comporre il nome del file o della variabile da altri campi, per esempio `cover = {nome}.png`, che per la carta Cavaliere diventa `Cavaliere.png`.

Scelta (rivista il 2026-10-18 su richiesta di Luca): la fonte del valore si imposta per livello nel template, con tre possibilità: colonna del foglio (di base quella con il nome del livello, ma se ne può indicare un'altra), valore fisso, formula. Una formula usa `{campo}` per i valori della riga e si calcola quando contiene + - * / e il risultato è numerico, altrimenti compone testo (`{nome}.png`). Le colonne delle altre proprietà (`nome.color`) valgono qualunque sia la fonte. Con `=` iniziale la formula è un'espressione come in Excel (`=IF({forza}>3; "Forte"; "Debole")`, funzioni con nomi inglesi). Il livello `value` contiene valori della carta senza disegnarli, da usare nelle formule. Il template indica il campo che dà il nome alle carte nella vista del set (`labelField`). Le formule di Excel restano utilizzabili nel foglio: l'app ne legge il risultato.

## Dopo la prima versione funzionante

Richieste da affrontare quando l'app copre già il flusso base (template, carte, esportazione, import da TTC).

- Importazione di icone negli asset da game-icons.net e da altri repository liberi, con ricerca dall'app. L'icona scaricata va in `assets/` con il nome e i dati di licenza e attribuzione richiesti dalla fonte (game-icons.net usa CC BY 3.0, che chiede di citare l'autore).
- Accesso agevole ai font Google: ricerca e anteprima dall'app, con scaricamento dei file in `assets/fonts/` così che il progetto funzioni anche senza rete e l'esportazione usi gli stessi font.
- Sfumature in tutti i campi colore (riempimento, testo, contorno, colorazione, ombra): lineari e radiali, con più punti di colore e angolo. Nel foglio si scrivono come testo, per esempio `linear(90, #A33A2A, #2F5DA8)`, così una colonna può cambiarle carta per carta.
- Insieme alle sfumature, la dissolvenza dell'opacità di un livello (o di un gruppo): una maschera a sfumatura lineare o radiale che porta il livello da opaco a trasparente, per esempio un'immagine che sfuma verso il basso.

## Quando l'app sarà stabile

- Strumenti che facilitino l'uso dell'IA per gestire i progetti: per esempio un plugin, una skill o un'interfaccia a riga di comando con cui un assistente possa leggere e modificare template, set, variabili ed esportazioni senza passare dall'interfaccia grafica.
