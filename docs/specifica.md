# Specifica funzionale

Definisce gli oggetti dell'app, le proprietà modificabili di ciascuno, variabili, stili, campi calcolati ed esportazione. Le unità sono millimetri, i colori `#RRGGBB` o `#RRGGBBAA`, le dimensioni del testo in punti (pt).

Ogni proprietà segnata con ◆ può essere esposta in tabella, cioè diventare una colonna del foglio dati (`livello.proprietà`) modificabile carta per carta. Le altre valgono per tutte le carte del template.

## 1. Proprietà comuni a tutti i livelli

| Proprietà            | Valori                                                       | Note                                                                 |
| -------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| nome                 | testo univoco nel template                                   | è anche il nome della colonna nel foglio                             |
| visibile ◆           | sì/no                                                        |                                                                      |
| bloccato             | sì/no                                                        | non selezionabile sulla tela                                         |
| x, y ◆               | mm                                                           | posizione dell'angolo in alto a sinistra rispetto al bordo di taglio |
| larghezza, altezza ◆ | mm                                                           |                                                                      |
| rotazione ◆          | gradi                                                        | attorno al punto di ancoraggio                                       |
| punto di ancoraggio  | 9 posizioni                                                  | centro di rotazione e riferimento per x e y                          |
| opacità ◆            | 0–100%                                                       |                                                                      |
| fusione              | normale, moltiplica, scolora, sovrapponi                     |                                                                      |
| ombra                | colore, sfocatura, distanza x e y                            |                                                                      |
| vincoli              | sinistra, destra, centro, entrambi (orizzontale e verticale) | comportamento quando cambia la dimensione del template o del gruppo  |
| sorgente del valore  | fissa, colonna, formula                                      | vedi sezione 7                                                       |

## 2. Testo

| Proprietà                | Valori                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------- |
| contenuto ◆              | testo con formattazione inline e variabili (sezione 2.1)                           |
| stile                    | nome di uno stile di testo (sezione 6)                                             |
| font, peso, corsivo ◆    | famiglia di Google Fonts o font del progetto                                       |
| dimensione ◆             | pt                                                                                 |
| colore ◆                 | colore o variabile colore                                                          |
| allineamento orizzontale | sinistra, centro, destra, giustificato                                             |
| allineamento verticale   | alto, centro, basso                                                                |
| interlinea               | % della dimensione                                                                 |
| spaziatura caratteri     | ‰                                                                                  |
| spaziatura paragrafi     | mm                                                                                 |
| rientro prima riga       | mm                                                                                 |
| margini interni          | mm sui quattro lati                                                                |
| trasformazione           | nessuna, MAIUSCOLO, minuscolo, Iniziali                                            |
| decorazione              | sottolineato, barrato                                                              |
| contorno del testo       | colore, spessore                                                                   |
| adattamento              | nessuno, riduci per stare nel riquadro (dimensione minima e massima), tronca con … |
| a capo                   | automatico, nessuno                                                                |
| icone inline             | altezza rispetto alla riga (%), spostamento verticale                              |

### 2.1 Formattazione inline

Nel file il testo è salvato con un markup ridotto, mentre l'editor mostra la formattazione e una barra strumenti per applicarla.

```
<b>grassetto</b>  <i>corsivo</i>  <u>sottolineato</u>  <s>barrato</s>
<color=#A33A2A>colore</color>  <size=12>dimensione</size>  <font=Nunito>font</font>
<style=parola-chiave>testo con uno stile</style>
{variabile}   {campo}   \n a capo
```

Lo stesso markup si può scrivere a mano nel foglio di calcolo.

## 3. Immagine

| Proprietà                 | Valori                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| sorgente ◆                | file in `assets/`, variabile immagine, oppure colonna o formula che restituisce un nome di file |
| adattamento               | riempi (ritaglia), adatta (bande vuote), allunga, dimensione originale, ripeti                  |
| allineamento interno      | 9 posizioni                                                                                     |
| zoom, spostamento x e y ◆ | %, mm                                                                                           |
| specchia                  | orizzontale, verticale ◆                                                                        |
| tinta ◆                   | colore e intensità; ricolora le icone monocromatiche                                            |
| regolazioni               | scala di grigi, luminosità, contrasto, saturazione                                              |
| raggio angoli             | mm                                                                                              |
| contorno                  | colore, spessore                                                                                |
| immagine mancante         | mostra segnaposto, nascondi livello                                                             |

## 4. Forma

| Proprietà     | Valori                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| tipo          | rettangolo, ellisse, poligono regolare (n lati), stella (n punte, rapporto interno), linea, tracciato libero |
| raggio angoli | mm, uguale o diverso per ogni angolo                                                                         |
| riempimento ◆ | nessuno, colore, gradiente lineare o radiale, immagine ripetuta                                              |
| contorno ◆    | colore, spessore, posizione (interno, centrato, esterno), tratteggio, terminazioni                           |
| punti         | modificabili sulla tela per poligoni e tracciati                                                             |

## 5. Gruppo

| Proprietà               | Valori                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| figli                   | qualsiasi livello, compresi altri gruppi                                                                        |
| ritaglia ai bordi       | sì/no; con il primo figlio come maschera                                                                        |
| disposizione automatica | nessuna, riga, colonna, griglia; spaziatura e allineamento                                                      |
| ripetizione ◆           | ripete il contenuto N volte, con N fisso o da un campo (per esempio un'icona di forza ripetuta `{forza}` volte) |

## 6. Variabili e stili

### 6.1 Variabili

Definite a livello di progetto, si richiamano con `{nome}` in qualunque testo e in qualunque campo.

| Tipo             | Contenuto                                                      | Esempio                                         |
| ---------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| immagine         | file, tinta, altezza rispetto alla riga, spostamento verticale | `{spada}` → icona della spada in rosso          |
| testo formattato | testo di sostituzione e stile o formattazione                  | `{pino}` → "pino" in verde e grassetto          |
| colore           | un colore con nome                                             | `{rosso}` usabile in qualsiasi proprietà colore |
| valore           | testo o numero costante                                        | `{max_mano}` → 7                                |

Ogni variabile ha un'anteprima nell'elenco. Rinominare una variabile aggiorna i riferimenti in template e fogli.

### 6.2 Stili di testo

Uno stile raggruppa proprietà di carattere (font, peso, corsivo, dimensione, colore, trasformazione, decorazione, contorno) e, se applicato a un intero livello, anche di paragrafo (allineamento, interlinea, spaziature).

- Uno stile può basarsi su un altro ed ereditarne le proprietà non ridefinite.
- Si applica a un intero livello di testo (proprietà `stile`) o a una porzione (`<style=nome>`).
- Modificare uno stile aggiorna tutte le carte che lo usano.
- La formattazione locale prevale sullo stile.

### 6.3 Palette

Colori con nome del progetto, usati da stili, forme e variabili colore. Coincidono con le variabili di tipo colore.

## 7. Campi calcolati

- Si definiscono per set: `nome campo`, `tipo` (testo, numero, immagine, colore), `formula`.
- La formula usa `{campo}` per i valori della stessa carta, operatori `+ - * /`, confronti, concatenazione e funzioni: `se(cond; sì; no)`, `minuscolo()`, `maiuscolo()`, `arrotonda()`, `min()`, `max()`, `ripeti(testo; n)`, `esiste(file)`.
- Un campo calcolato si usa come sorgente di un livello o dentro un testo.
- In tabella è una colonna di sola lettura; una cella compilata a mano vale come eccezione per quella carta.
- Riferimenti circolari ed errori sono segnalati sulla riga.

## 8. Template e set

### 8.1 Template

| Proprietà       | Valori                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| dimensioni      | mm, con preset: poker 63×88, bridge 57×89, mini 44×63, tarocchi 70×120, quadrata 70×70, segnalino tondo, plancia A4 |
| forma           | rettangolo con raggio, cerchio, esagono, tracciato personalizzato                                                   |
| abbondanza      | mm (default 3)                                                                                                      |
| area sicura     | mm dal bordo di taglio, solo come guida                                                                             |
| retro           | nessuno, unico per il set, per carta (livelli del retro collegati al foglio)                                        |
| griglia e guide | passo in mm, guide manuali                                                                                          |

### 8.2 Set

| Proprietà            | Valori                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| template             | uno per set                                                                                                          |
| foglio               | foglio del file dati                                                                                                 |
| copie                | colonna `amount` (1 se vuota)                                                                                        |
| viste                | tabella con anteprima; griglia di anteprime (zoom, fronte/retro, filtro, selezione multipla per modifiche in blocco) |
| ordinamento e filtro | per qualsiasi colonna, solo nella vista                                                                              |

## 9. Esportazione

Le esportazioni si salvano come profili nel progetto, così si possono rilanciare. Ogni profilo indica i set da includere e se rispettare le copie.

### 9.1 Immagini

| Opzione       | Valori                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| formato       | PNG, JPG (qualità), WebP                                                                  |
| risoluzione   | 150, 300, 600 DPI o personalizzata                                                        |
| abbondanza    | inclusa, esclusa                                                                          |
| lati          | fronte, retro, entrambi                                                                   |
| sfondo        | pieno, trasparente (PNG/WebP)                                                             |
| nome dei file | modello con `%set`, `%n` (progressivo), `%copia`, `{campo}`; per esempio `%set/%n_{nome}` |

### 9.2 PDF di stampa

| Opzione              | Valori                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| pagina               | A4, A3, Letter, personalizzata; verticale, orizzontale                                                                 |
| margini e spaziatura | mm                                                                                                                     |
| disposizione         | automatica (massimo di carte per pagina) o righe × colonne                                                             |
| abbondanza           | inclusa o no; se inclusa le carte si toccano e i segni di taglio sono esterni                                          |
| segni di taglio      | nessuno, angoli, linee intere; lunghezza, spessore, colore, sopra o sotto le carte                                     |
| fronte-retro         | nessuno; pagine alternate con retro speculari (rilegatura lato lungo o corto); compensazione del disallineamento x e y |
| piegatura            | fronte e retro affiancati sulla stessa pagina, con linea di piegatura                                                  |
| file                 | unico, uno per set, uno per lato                                                                                       |
| fogli di prova       | pagina riepilogo a bassa risoluzione con tutte le carte                                                                |

Il PDF è vettoriale, con i font incorporati e in RGB. Il CMYK richiesto da alcune tipografie richiede una conversione successiva: da valutare con Ghostscript in un secondo momento.

### 9.3 Tabletop Simulator

| Opzione            | Valori                                                                         |
| ------------------ | ------------------------------------------------------------------------------ |
| griglia            | fino a 10×7 carte per foglio, l'ultima posizione riservata alla carta nascosta |
| dimensione massima | 4096 o 8192 px per lato                                                        |
| retro              | unico o foglio dei retri                                                       |
| destinazione       | cartella del progetto o cartella di Tabletop Simulator                         |
| oggetto salvato    | file JSON del mazzo pronto da caricare                                         |

### 9.4 Preset per tipografie

Profili precompilati per i servizi di stampa più comuni (una immagine per carta a 300 DPI con abbondanza, nomi file richiesti dal servizio). I parametri esatti vanno verificati sul sito di ciascun servizio prima di definirli.
