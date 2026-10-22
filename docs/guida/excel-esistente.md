# Usare un file Excel che hai già

Se hai già un file Excel con i dati delle carte, le formule e i fogli di analisi, Naibi può usarlo come file dei dati del progetto. Due cose da sapere prima di cominciare:

- Naibi legge i risultati che Excel ha salvato nel file e **non ricalcola le formule** delle celle.
- Quando salva i dati di un set, Naibi riscrive il file: alcuni oggetti che non conosce, come i **grafici**, si perdono (vedi [Limiti](#limiti)).

Il modo più sicuro è lasciare i calcoli in Excel, preparare un foglio "pulito" per ogni set, mettere il file dei dati **in sola lettura** in Naibi e modificare i dati solo in Excel: a ogni salvataggio in Excel Naibi rilegge il file da solo.

Torna alla [guida](README.md).

## Cosa fa Naibi con il file

Un progetto ha un solo file dei dati (di solito `data/cards.xlsx`, indicato in `naibi.json` alla voce `dataFile`). Ogni set è collegato a un foglio del file. Gli esempi usano un file con il foglio "Unità" (colonne Nome, Attacco, Difesa, Costo con `=B2+C2`) e un foglio "Analisi".

| Domanda                                                                  | Risposta                                                                                                                                                                                                                                       | Esempio                                                                                                                                                                                              |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legge le formule o i risultati?                                          | I risultati che Excel ha salvato nel file l'ultima volta. Naibi non ricalcola le formule delle celle.                                                                                                                                          | La cella D2 (Costo) contiene `=B2+C2` e mostra 5: Naibi legge `5`.                                                                                                                                   |
| Se cambio un valore in Naibi, le formule che ne dipendono si aggiornano? | No. La formula resta nel file, ma il risultato salvato resta quello vecchio finché non apri e salvi il file in Excel.                                                                                                                          | In Naibi porti l'attacco del Fante da 2 a 9 e salvi: il costo resta 5. Apri e salvi il file in Excel: Naibi lo rilegge e il costo diventa 12.                                                        |
| Quale riga sono le intestazioni?                                         | La prima riga con dati. Ogni colonna con intestazione diventa un campo; le colonne senza intestazione sono ignorate.                                                                                                                           | Riga 1: `Nome`, `Attacco`, `Costo` diventano i campi `{Nome}`, `{Attacco}`, `{Costo}`. Una colonna con l'intestazione vuota non compare in Naibi.                                                    |
| E i fogli che non sono set (analisi, tabelle di calcolo)?                | Restano nel file e non vengono toccati. Naibi li elenca come "Fogli non collegati a un set".                                                                                                                                                   | Il foglio "Analisi" con `=MEDIA(Unità!D2:D10)` resta com'è.                                                                                                                                          |
| Quando Naibi riscrive il file?                                           | Quando salvi dati modificati di un set, crei un set con un foglio nuovo, rinomini o elimini un set. Aprire il progetto, modificare template ed esportare non scrivono nel file.                                                                | Correggi il nome di una carta nella griglia e premi Salva: il file viene riscritto. Esporti il PDF: il file non cambia.                                                                              |
| Cosa riscrive?                                                           | Solo le celle delle colonne con intestazione dei fogli modificati, e solo se il testo è cambiato. Una cella con formula il cui risultato non cambia resta formula. Formattazione, colori, formattazione condizionale e convalida dati restano. | Cambi l'attacco del Fante: nel file cambia solo B2, che resta gialla; D2 resta `=B2+C2`.                                                                                                             |
| Le righe vuote tra le carte?                                             | In lettura si saltano; salvando, ogni carta torna nella sua riga e le righe vuote restano dove sono.                                                                                                                                           | Righe 2, 4 e 5 con dati e riga 3 vuota: dopo il salvataggio la riga 3 è ancora vuota.                                                                                                                |
| Cosa perde riscrivendo?                                                  | Tutto quello che la libreria usata da Naibi non conosce, in tutto il file: nelle prove i **grafici** spariscono anche dai fogli che Naibi non usa. Prima di salvare Naibi avvisa e chiede se continuare.                                       | Il grafico del foglio "Analisi" non c'è più dopo il salvataggio, anche se hai modificato solo "Unità".                                                                                               |
| Si accorge se modifico il file in Excel con Naibi aperto?                | Sì. Quando salvi il file, Naibi lo rilegge da solo; se in Naibi ci sono modifiche ai dati non salvate, chiede con un avviso.                                                                                                                   | Cambi un costo in Excel e salvi: dopo un secondo la carta in Naibi mostra il valore nuovo.                                                                                                           |
| Formati dei numeri                                                       | Come li mostra Excel, ma con il punto per i decimali e lo spazio per le migliaia. Le date arrivano come `AAAA-MM-GG`. Le formule di Naibi leggono `50%` come 0,5.                                                                              | Una cella con 0,5 formattata come 50% compare sulla carta come `50%`; 1234,5 formattata come `#.##0,00 €` come `1 234.50 €`. Se in Naibi scrivi `60%`, nel file va il numero 0,6 con il suo formato. |

## Tre modi di lavorare

Per chi ha già un Excel con calcoli e analisi conviene il modo A. Il B è per chi vuole passare a modificare i dati in Naibi; il C per chi preferisce tenere tutto in Google Fogli.

| Modo                        | Come funziona                                                                                                                                                                                                                                                     | Pro                                                                       | Contro                                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A. Excel resta la fonte** | Il tuo file diventa il file dei dati del progetto. Aggiungi un foglio "pulito" per ogni set, riempito da formule che prendono i valori dai tuoi fogli. In Naibi metti il file dei dati in sola lettura; modifichi solo in Excel e salvi, e Naibi rilegge da solo. | Calcoli e analisi restano vivi; nessuna copia a mano.                     | I dati non si modificano in Naibi (la sola lettura lo impedisce, e senza di essa un salvataggio toglierebbe i grafici). Le formule si aggiornano solo salvando in Excel. |
| **B. Copia dei valori**     | Il progetto ha il suo file dei dati. Dal tuo Excel copi le colonne e le incolli come _solo valori_ nel foglio del set, oppure usi **Importa un foglio da un altro file…** (in **Controlla file dati…**), che mostra prima cosa cambia.                            | Il tuo Excel non viene mai toccato; in Naibi puoi modificare liberamente. | Ogni aggiornamento è una copia a mano; i due file possono divergere.                                                                                                     |
| **C. Google Fogli**         | Carichi il file su Google Drive come foglio Google, lo condividi con "chiunque abbia il link" e usi **Google Sheets…** ([5.6](README.md#56-dati-da-google-sheets)) o `naibi pull-sheets`.                                                                         | Google calcola le formule e Naibi riceve i risultati aggiornati.          | Solo in un verso: la copia locale ha solo i valori.                                                                                                                      |

In tutti e tre i casi, i calcoli che servono a una sola carta possono passare nelle formule del template (vedi sotto).

## Passo passo (modo A)

**In Excel**

1. Fai una copia di sicurezza del file. Il file deve essere `.xlsx` (non `.xls` né `.xlsm` con macro).
2. Per ogni tipo di carta crea un foglio nuovo, per esempio "Truppe", con questa forma:
   - riga 1: le intestazioni, una per campo, senza titoli sopra;
   - dalla riga 2: una carta per riga, senza celle unite;
   - nomi delle intestazioni semplici e stabili (`nome`, `attacco`, `costo`): saranno i nomi dei campi in Naibi.
3. Riempi il foglio con formule che prendono i valori dai tuoi fogli di lavoro (`=Unità!B5`, `=CERCA.VERT(...)`). I tuoi fogli di analisi restano come sono.
4. Il formato dei numeri vale anche in Naibi: una percentuale arriva come `50%`. I decimali però arrivano con il punto (`1.5`); se sulla carta vuoi la virgola, fai diventare il numero testo in Excel: `=TESTO(Unità!D5;"0,0")`.
5. Salva e chiudi Excel. Il salvataggio aggiorna i risultati delle formule che Naibi leggerà.

**In Naibi**

6. **Nuovo progetto**: in **File dei dati** scegli **Un file che hai già** e indica il tuo file. Naibi ne mette una copia nella cartella `data` del progetto; da qui in poi lavori su quella copia.
7. Per un progetto che esiste già: chiudi Naibi, copia il file nella cartella `data` del progetto e cambia `dataFile` in `naibi.json`, per esempio `"data/gioco.xlsx"`.
8. Nel progetto, nella barra laterale compare "Fogli non collegati a un set" con tutti i fogli del file. **Controlla file dati…**, in fondo alla barra laterale, dice per ogni foglio cosa potrebbe non andare: titoli sopra le intestazioni, celle unite, errori, formule senza risultato, righe vuote.
9. Crea un template. Per ogni livello che mostra un dato, in **Valore sulle carte** scegli **Colonna** e indica l'intestazione del foglio.
10. **Nuovo set**: scegli il template e, in **Foglio**, il foglio "Truppe". Il set mostra subito le righe del foglio.
    Per avere due mazzi con gli stessi dati e grafica diversa (truppe rosse e gialle), crea un secondo set, con un altro template, sullo stesso foglio: in **Foglio** è nel gruppo dei fogli già usati ([5.1](README.md#51-creare-un-set)).

**Per aggiornare**

11. In fondo alla barra laterale spunta **in sola lettura** accanto al nome del file e salva. Da qui in poi Naibi non scrive nel file dei dati: rifiuta le modifiche ai dati, rinominare un set non rinomina il foglio ed eliminare un set lascia il foglio nel file.
12. Cambi i numeri in Excel e salvi: Naibi rilegge il file da solo. Modificare template, anteprime ed esportare funziona come sempre.

## Spostare calcoli nei template

I calcoli che usano solo i dati della stessa carta possono passare nel template, dove Naibi li ricalcola subito a ogni modifica. Nel livello scegli **Formula** e scrivi per esempio `{attacco}+{difesa}` oppure `=IF({costo}>5; "Raro"; "Comune")`. Le funzioni, con un esempio ciascuna, sono nell'aiuto (F1, scheda **Formule**) e nel [capitolo 9](README.md#9-formule-e-campi-calcolati).

Restano in Excel i calcoli che guardano altre righe o altri fogli: somme e medie di colonna, CERCA.VERT, classifiche, bilanciamento.

## Limiti

Prove fatte con file salvati da LibreOffice; con file salvati da Microsoft Excel il risultato per grafici, tabelle e immagini potrebbe essere diverso.

| Situazione                                                       | Cosa succede                                                                                                                                                          |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grafici, tabelle pivot, filtri dati in qualsiasi foglio          | Al primo salvataggio di dati da Naibi spariscono dal file, anche da fogli non collegati. Prima di salvare Naibi lo dice e chiede se continuare.                       |
| Titolo sopra le intestazioni                                     | La prima riga con dati diventa l'intestazione: i campi sono sbagliati. Si risolve col foglio "pulito".                                                                |
| Cella con formula modificata in Naibi                            | La formula è sostituita dal valore scritto.                                                                                                                           |
| Valori che dipendono da celle cambiate in Naibi                  | Resta il risultato vecchio finché il file non è aperto e salvato in Excel. Excel di solito ricalcola all'apertura; LibreOffice per i file Excel di norma no.          |
| Rinominare un set                                                | Naibi chiede se rinominare anche il foglio. Se sì, le formule di altri fogli che lo citano restano col nome vecchio e si rompono; se no, il foglio tiene il suo nome. |
| Eliminare un set                                                 | Il suo foglio esce dal file (una copia va in `deleted/`); le formule che lo citano si rompono.                                                                        |
| Celle unite                                                      | Il valore viene ripetuto in tutte le celle unite; l'unione resta.                                                                                                     |
| Formattazione come tabella di Excel                              | Le righe aggiunte da Naibi restano fuori dall'intervallo della tabella.                                                                                               |
| File con immagini, commenti o tabelle creati da alcuni programmi | Naibi può non riuscire ad aprirli ("Cannot read properties of undefined").                                                                                            |
| Tabelle pivot, macro, forme                                      | Non provati: considerali a rischio se Naibi salva.                                                                                                                    |
| Excel aperto mentre Naibi salva                                  | Su Windows Excel blocca il file e il salvataggio probabilmente non riesce; su Mac vince chi salva per ultimo.                                                         |

I backup automatici di Naibi contengono anche il file dei dati, ma prima di cominciare conviene comunque una copia tua.
