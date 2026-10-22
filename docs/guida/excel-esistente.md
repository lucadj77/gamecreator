# Usare un file Excel che hai già

Se hai già un file Excel con i dati delle carte, le formule e i fogli di analisi, Naibi può usarlo come file dei dati del progetto. Due cose da sapere prima di cominciare:

- Naibi legge i risultati che Excel ha salvato nel file e **non ricalcola le formule** delle celle.
- Quando salva i dati di un set, Naibi riscrive il file: alcuni oggetti che non conosce, come i **grafici**, si perdono (vedi [Limiti](#limiti)).

Il modo più sicuro è lasciare i calcoli in Excel, preparare un foglio "pulito" per ogni set e modificare i dati solo in Excel, premendo **Ricarica** in Naibi.

Torna alla [guida](README.md).

## Cosa fa Naibi con il file

Un progetto ha un solo file dei dati (di solito `data/cards.xlsx`, indicato in `naibi.json` alla voce `dataFile`). Ogni set è collegato a un foglio del file. Gli esempi usano un file con il foglio "Unità" (colonne Nome, Attacco, Difesa, Costo con `=B2+C2`) e un foglio "Analisi".

| Domanda                                                                  | Risposta                                                                                                                                                                                                                                       | Esempio                                                                                                                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legge le formule o i risultati?                                          | I risultati che Excel ha salvato nel file l'ultima volta. Naibi non ricalcola le formule delle celle.                                                                                                                                          | La cella D2 (Costo) contiene `=B2+C2` e mostra 5: Naibi legge `5`.                                                                                |
| Se cambio un valore in Naibi, le formule che ne dipendono si aggiornano? | No. La formula resta nel file, ma il risultato salvato resta quello vecchio finché non apri e salvi il file in Excel.                                                                                                                          | In Naibi porti l'attacco del Fante da 2 a 9 e salvi: il costo resta 5. Apri e salvi il file in Excel, premi Ricarica: diventa 12.                 |
| Quale riga sono le intestazioni?                                         | La prima riga con dati. Ogni colonna con intestazione diventa un campo; le colonne senza intestazione sono ignorate.                                                                                                                           | Riga 1: `Nome`, `Attacco`, `Costo` diventano i campi `{Nome}`, `{Attacco}`, `{Costo}`. Una colonna con l'intestazione vuota non compare in Naibi. |
| E i fogli che non sono set (analisi, tabelle di calcolo)?                | Restano nel file e non vengono toccati. Naibi li elenca come "Fogli non collegati a un set".                                                                                                                                                   | Il foglio "Analisi" con `=MEDIA(Unità!D2:D10)` resta com'è.                                                                                       |
| Quando Naibi riscrive il file?                                           | Quando salvi dati modificati di un set, crei un set con un foglio nuovo, rinomini o elimini un set. Aprire il progetto, modificare template ed esportare non scrivono nel file.                                                                | Correggi il nome di una carta nella griglia e premi Salva: il file viene riscritto. Esporti il PDF: il file non cambia.                           |
| Cosa riscrive?                                                           | Solo le celle delle colonne con intestazione dei fogli modificati, e solo se il testo è cambiato. Una cella con formula il cui risultato non cambia resta formula. Formattazione, colori, formattazione condizionale e convalida dati restano. | Cambi l'attacco del Fante: nel file cambia solo B2, che resta gialla; D2 resta `=B2+C2`.                                                          |
| Le righe vuote tra le carte?                                             | In lettura si saltano; salvando, ogni carta torna nella sua riga e le righe vuote restano dove sono.                                                                                                                                           | Righe 2, 4 e 5 con dati e riga 3 vuota: dopo il salvataggio la riga 3 è ancora vuota.                                                             |
| Cosa perde riscrivendo?                                                  | Tutto quello che la libreria usata da Naibi non conosce, in tutto il file: nelle prove i **grafici** spariscono anche dai fogli che Naibi non usa.                                                                                             | Il grafico del foglio "Analisi" non c'è più dopo il salvataggio, anche se hai modificato solo "Unità".                                            |
| Si accorge se modifico il file in Excel con Naibi aperto?                | No. Bisogna premere **Ricarica** (le modifiche non salvate in Naibi si perdono).                                                                                                                                                               | Cambi un costo in Excel e salvi: Naibi mostra il valore vecchio finché non premi Ricarica.                                                        |
| Formati dei numeri                                                       | Ignorati. Le date arrivano come `AAAA-MM-GG`.                                                                                                                                                                                                  | Una cella con 0,5 formattata come 50% compare sulla carta come `0.5`; 1,5 come `1.5`.                                                             |

## Tre modi di lavorare

Per chi ha già un Excel con calcoli e analisi conviene il modo A. Il B è per chi vuole passare a modificare i dati in Naibi; il C per chi preferisce tenere tutto in Google Fogli.

| Modo                        | Come funziona                                                                                                                                                                                                     | Pro                                                                       | Contro                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Excel resta la fonte** | Il tuo file diventa il file dei dati del progetto. Aggiungi un foglio "pulito" per ogni set, riempito da formule che prendono i valori dai tuoi fogli. Modifichi solo in Excel, salvi, e in Naibi premi Ricarica. | Calcoli e analisi restano vivi; nessuna copia a mano.                     | Non devi salvare dati dalla griglia di Naibi: un salvataggio toglie i grafici dal file. Devi ricordarti di salvare in Excel e ricaricare. |
| **B. Copia dei valori**     | Il progetto ha il suo file dei dati. Dal tuo Excel copi le colonne e le incolli come _solo valori_ nel foglio del set.                                                                                            | Il tuo Excel non viene mai toccato; in Naibi puoi modificare liberamente. | Ogni aggiornamento è una copia a mano; i due file possono divergere.                                                                      |
| **C. Google Fogli**         | Carichi il file su Google Drive come foglio Google, lo condividi con "chiunque abbia il link" e usi **Google Sheets…** ([5.6](README.md#56-dati-da-google-sheets)) o `naibi pull-sheets`.                         | Google calcola le formule e Naibi riceve i risultati aggiornati.          | Solo in un verso: la copia locale ha solo i valori.                                                                                       |

In tutti e tre i casi, i calcoli che servono a una sola carta possono passare nelle formule del template (vedi sotto).

## Passo passo (modo A)

**In Excel**

1. Fai una copia di sicurezza del file. Il file deve essere `.xlsx` (non `.xls` né `.xlsm` con macro).
2. Per ogni tipo di carta crea un foglio nuovo, per esempio "Truppe", con questa forma:
   - riga 1: le intestazioni, una per campo, senza titoli sopra;
   - dalla riga 2: una carta per riga, senza celle unite;
   - nomi delle intestazioni semplici e stabili (`nome`, `attacco`, `costo`): saranno i nomi dei campi in Naibi.
3. Riempi il foglio con formule che prendono i valori dai tuoi fogli di lavoro (`=Unità!B5`, `=CERCA.VERT(...)`). I tuoi fogli di analisi restano come sono.
4. Dove conta come appare il numero sulla carta, fallo diventare testo in Excel: `=TESTO(Unità!C5;"0%")` per una percentuale, `=TESTO(Unità!D5;"0,0")` per la virgola decimale. Altrimenti Naibi riceve `0.5` e `1.5`.
5. Salva e chiudi Excel. Il salvataggio aggiorna i risultati delle formule che Naibi leggerà.

**In Naibi**

6. Crea un progetto nuovo con file dei dati Excel. Chiudi Naibi.
7. Copia il tuo file nella cartella `data` del progetto e chiamalo `cards.xlsx` (oppure lascialo col suo nome e cambia `dataFile` in `naibi.json`, per esempio `"data/gioco.xlsx"`).
8. Apri il progetto: nella barra laterale compare "Fogli non collegati a un set" con tutti i fogli del file.
9. Crea un template. Per ogni livello che mostra un dato, in **Valore sulle carte** scegli **Colonna** e indica l'intestazione del foglio.
10. **Nuovo set**: scegli il template e, in **Foglio**, il foglio "Truppe". Il set mostra subito le righe del foglio.

**Per aggiornare**

11. Cambi i numeri in Excel, salvi, poi in Naibi premi **Ricarica**.
12. Non modificare i dati nella griglia di Naibi e non rinominare o eliminare il set: sono le azioni che riscrivono il file. Modificare template, anteprime ed esportare è sicuro.

## Spostare calcoli nei template

I calcoli che usano solo i dati della stessa carta possono passare nel template, dove Naibi li ricalcola subito a ogni modifica. Nel livello scegli **Formula** e scrivi per esempio `{attacco}+{difesa}` oppure `=IF({costo}>5; "Raro"; "Comune")`. Le funzioni, con un esempio ciascuna, sono nell'aiuto (F1, scheda **Formule**) e nel [capitolo 9](README.md#9-formule-e-campi-calcolati).

Restano in Excel i calcoli che guardano altre righe o altri fogli: somme e medie di colonna, CERCA.VERT, classifiche, bilanciamento.

## Limiti

Prove fatte con file salvati da LibreOffice; con file salvati da Microsoft Excel il risultato per grafici, tabelle e immagini potrebbe essere diverso.

| Situazione                                                       | Cosa succede                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grafici in qualsiasi foglio                                      | Al primo salvataggio di dati da Naibi spariscono dal file, anche da fogli non collegati.                                                                     |
| Titolo sopra le intestazioni                                     | La prima riga con dati diventa l'intestazione: i campi sono sbagliati. Si risolve col foglio "pulito".                                                       |
| Cella con formula modificata in Naibi                            | La formula è sostituita dal valore scritto.                                                                                                                  |
| Valori che dipendono da celle cambiate in Naibi                  | Resta il risultato vecchio finché il file non è aperto e salvato in Excel. Excel di solito ricalcola all'apertura; LibreOffice per i file Excel di norma no. |
| Rinominare un set                                                | Il foglio cambia nome; le formule di altri fogli che lo citano restano col nome vecchio e si rompono.                                                        |
| Eliminare un set                                                 | Il suo foglio esce dal file (una copia va in `deleted/`); le formule che lo citano si rompono.                                                               |
| Celle con errore (#DIV/0!, #N/D)                                 | Compaiono come `[object Object]`.                                                                                                                            |
| Valore FALSO                                                     | Compare vuoto (VERO compare `true`).                                                                                                                         |
| Celle unite                                                      | Il valore viene ripetuto in tutte le celle unite; l'unione resta.                                                                                            |
| Formattazione come tabella di Excel                              | Le righe aggiunte da Naibi restano fuori dall'intervallo della tabella.                                                                                      |
| File con immagini, commenti o tabelle creati da alcuni programmi | Naibi può non riuscire ad aprirli ("Cannot read properties of undefined").                                                                                   |
| Tabelle pivot, macro, forme                                      | Non provati: considerali a rischio se Naibi salva.                                                                                                           |
| Excel aperto mentre Naibi salva                                  | Su Windows Excel blocca il file e il salvataggio probabilmente non riesce; su Mac vince chi salva per ultimo.                                                |

I backup automatici di Naibi contengono anche il file dei dati, ma prima di cominciare conviene comunque una copia tua.
