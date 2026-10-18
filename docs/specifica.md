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
| contorno del testo       | colore, spessore in mm o in % della dimensione del testo                           |
| adattamento              | nessuno, riduci per stare nel riquadro (dimensione minima e massima), tronca con … |
| a capo                   | automatico, nessuno                                                                |
| icone inline             | altezza rispetto alla riga (%), spostamento verticale                              |

### 2.1 Markup del testo

Il testo si salva, nel progetto e nel foglio, con un unico markup: Markdown per la formattazione di base più un'estensione per colore, dimensione, evidenziazione e stili. L'editor della carta lo mostra già formattato e lo scrive tramite la barra strumenti, ma si può scrivere a mano anche in Excel. Non si usa HTML.

#### Markdown

| Scrivi                       | Ottieni                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `**testo**`                  | grassetto                                                |
| `*testo*`                    | corsivo                                                  |
| `++testo++`                  | sottolineato                                             |
| `~~testo~~`                  | barrato                                                  |
| `==testo==`                  | evidenziato con il colore di evidenziazione del progetto |
| `^testo^` / `~testo~`        | apice / pedice                                           |
| `# Titolo`, `## Sottotitolo` | paragrafo con lo stile `heading1` / `heading2`           |
| `> testo`                    | paragrafo con lo stile `note`                            |
| `- voce` / `1. voce`         | elenco puntato / numerato                                |
| `---`                        | linea separatrice                                        |
| a capo                       | nuovo paragrafo                                          |
| riga vuota                   | paragrafo vuoto (spazio verticale)                       |
| `\` a fine riga              | a capo senza nuovo paragrafo                             |

Gli stili `heading1`, `heading2` e `note` esistono in ogni progetto e si modificano come gli altri.

Diversamente dal Markdown, ogni a capo inizia un nuovo paragrafo: è ciò che ci si aspetta scrivendo in una cella di Excel con Alt+Invio. Gli asterischi staccati dal testo (`3 * 4`) restano asterischi.

#### Attributi: `[testo]{...}`

Le parentesi quadre delimitano il testo, le graffe subito dopo dicono come formattarlo. Gli attributi si combinano separati da spazi. Le parole chiave sono in inglese, come tutti gli identificatori dell'app (sezione 2.2).

**Carattere**

| Attributo                               | Esempio                                       | Effetto                                                                         |
| --------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `.name`                                 | `[pino]{.keyword}`                            | applica uno stile                                                               |
| `color=`                                | `[Attenzione]{color=red}` · `{color=#A33A2A}` | colore del testo, da palette o esadecimale                                      |
| `highlight=`                            | `[raro]{highlight=yellow}`                    | colore di evidenziazione dietro il testo                                        |
| `size=`                                 | `{size=14}` · `{size=+2}` · `{size=80%}`      | dimensione in pt, relativa o in percentuale                                     |
| `font=`                                 | `{font=Cinzel}` · `{font=Open_Sans}`          | famiglia; `_` al posto degli spazi                                              |
| `weight=`                               | `{weight=800}`                                | peso del carattere                                                              |
| `stroke=`                               | `{stroke=white/0.3}` · `{stroke=white/8%}`    | contorno delle lettere: colore/spessore in mm o in % della dimensione del testo |
| `spacing=`                              | `{spacing=50}`                                | spaziatura caratteri in ‰                                                       |
| `raise=`                                | `{raise=1}`                                   | spostamento dalla linea di base in pt                                           |
| `upper`, `lower`, `smallcaps`           | `[Fase]{smallcaps}`                           | trasformazione                                                                  |
| `bold`, `italic`, `underline`, `strike` | `{.flavor italic}`                            | come i segni Markdown, utili negli stili                                        |
| `left`, `center`, `right`, `justify`    | `{.flavor center}`                            | allineamento, solo per un paragrafo o in uno stile                              |

**Riquadro attorno al testo**

Trasformano la porzione di testo in un riquadro in linea, che segue la riga come un'icona.

| Attributo   | Esempio                             | Effetto                                                                                  |
| ----------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `border=`   | `[Rapido]{border=red/0.3}`          | bordo attorno al testo, colore/spessore in mm                                            |
| `fill=`     | `[Rapido]{fill=#EDE4D3}`            | colore di sfondo del riquadro                                                            |
| `radius=`   | `{radius=1}` · `{radius=round}`     | raggio degli angoli in mm, `round` per una pillola o un cerchio                          |
| `pad=`      | `{pad=0.5}` · `{pad=0.5/1}`         | margine interno in mm (verticale/orizzontale)                                            |
| `bg=`       | `[7]{bg=square}` · `[3]{bg=shield}` | immagine di sfondo: una variabile immagine o un file; il testo è centrato sopra          |
| `bg-color=` | `{bg=shield bg-color=blue}`         | tinta dell'immagine di sfondo                                                            |
| `bg-size=`  | `{bg-size=140%}` · `{bg-size=4}`    | dimensione dello sfondo rispetto alla riga o in mm; di base si adatta al testo più `pad` |

Esempi:

- `[7]{bg=square color=white weight=800}`: il numero 7 in bianco dentro l'icona quadrata.
- `[3]{bg=shield bg-color=blue color=white size=-1}`: un 3 dentro uno scudo colorato di blu.
- `[{forza}]{bg=circle bg-color=red color=white}`: il valore del campo forza dentro un cerchio rosso.
- `[Rapido]{border=red/0.3 radius=round pad=0.3/1}`: una parola chiave in una pillola bordata.

Le forme `circle`, `square`, `rounded`, `hexagon` e `diamond` sono sempre disponibili come sfondo senza definire variabili.

#### Variabili e campi

| Scrivi                        | Ottieni                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| `{spada}`                     | variabile del progetto (icona, testo formattato, colore, valore) |
| `{forza}`                     | valore di un campo della carta, anche calcolato                  |
| `{spada*3}` · `{spada*forza}` | icona ripetuta tre volte o tante volte quanto vale il campo      |
| `\{`, `\*`, `\[`              | carattere letterale                                              |

Se una variabile e un campo hanno lo stesso nome vince il campo, e l'app lo segnala.

`{nome}` che non è né un campo né una variabile si cerca tra le immagini di `assets/` (sezione 3.1) e si disegna come icona alta quanto la riga. Se non si trova, il testo resta com'è, sottolineato in rosso, e il problema compare sotto la carta.

#### Aiuto alla scrittura

Nell'editor della carta, nei campi di testo del pannello e nelle celle della tabella:

- digitando `{` compaiono variabili e campi, con anteprima;
- dentro `{...}` dopo `]` compaiono gli attributi, ciascuno con una riga che spiega cosa fa, poi i valori possibili (stili dopo `.`, colori dopo `color=`, forme dopo `bg=`);
- il markup è colorato e gli errori (attributo sconosciuto, variabile inesistente, immagine ambigua) sono sottolineati con la spiegazione al passaggio del mouse.

Stato attuale: i suggerimenti funzionano nel pannello proprietà, nei campi della carta e nelle celle della tabella (↑↓ per scegliere, Invio o Tab per inserire, Esc per chiudere); gli errori sono elencati sotto il campo e sotto la carta. La colorazione del markup dentro il campo e l'anteprima delle variabili sono da fare.

#### Editor del formato e degli stili

Nei campi del pannello e della carta, il pulsante "Aa Formatta…" apre un editor visuale degli attributi: si seleziona del testo (che diventa `[testo]{...}`) oppure si mette il cursore dentro una porzione `[testo]{...}` esistente per modificarla. L'editor mostra un'anteprima, i campi per ciascun attributo e il testo degli attributi come si scrive, sincronizzato. "Rimuovi formattazione" toglie le parentesi; "Salva come stile…" salva gli attributi come stile del progetto e sostituisce la formattazione con `{.nome}`.

Gli stili del progetto sono elencati nella sezione "Stili" della barra laterale e si modificano con lo stesso editor; uno stile del progetto con il nome di uno predefinito lo sostituisce. Rinominare uno stile non aggiorna i testi che lo usano.

#### Esempio completo

```
# Cavaliere
Quando attacchi, pesca **una carta**.
Bonus +1 {spada} contro i [pino]{.keyword}.
Costo: [3]{bg=circle bg-color=blue color=white}

{.flavor center} *Il castello non cadrà stanotte.*
```

### 2.2 Lingua

L'interfaccia è in inglese, con la traduzione italiana come prima lingua aggiuntiva. Tutto ciò che si scrive nei file resta in inglese e non dipende dalla lingua dell'interfaccia: parole chiave del markup, nomi degli stili predefiniti, funzioni delle formule, chiavi dei file di progetto, colonna `amount`, forme predefinite. I nomi scelti dall'utente (livelli, campi, variabili, stili, set) restano come li scrive.

## 3. Immagine

| Proprietà                 | Valori                                                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| sorgente ◆                | file in `assets/`, variabile immagine, oppure colonna o formula che restituisce un nome di file (risoluzione dei nomi: sezione 3.1) |
| adattamento               | riempi (ritaglia), adatta (bande vuote), allunga, dimensione originale, ripeti                                                      |
| allineamento interno      | 9 posizioni                                                                                                                         |
| zoom, spostamento x e y ◆ | %, mm                                                                                                                               |
| specchia                  | orizzontale, verticale ◆                                                                                                            |
| tinta ◆                   | colore e intensità; ricolora le icone monocromatiche                                                                                |
| regolazioni               | scala di grigi, luminosità, contrasto, saturazione                                                                                  |
| raggio angoli             | mm                                                                                                                                  |
| contorno                  | colore, spessore                                                                                                                    |
| immagine mancante         | mostra segnaposto, nascondi livello                                                                                                 |

### 3.1 Risoluzione dei nomi di file

Ovunque si indichi un'immagine (livello, campo, formula, variabile, `bg=`) basta il nome del file, senza percorso e senza estensione.

1. Si cerca in tutto `assets/`, sottocartelle comprese.
2. Un nome con estensione (`spada.png`) o con percorso (`icone/spada`) vale così com'è.
3. Senza estensione si accettano `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`.
4. Se il nome corrisponde a più file (`spada.png` e `spada.svg`, oppure `spada.png` in due sottocartelle) l'app non sceglie da sola: segnala l'ambiguità sulla carta e in tabella, e chiede di aggiungere estensione o percorso.
5. Una variabile immagine con lo stesso nome di un file prevale sul file.

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

| Tipo             | Contenuto                                                           | Esempio                                         |
| ---------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| immagine         | file, tinta, altezza, spostamento, rotazione, ribaltamento, opacità | `{spada}` → icona della spada in rosso          |
| testo formattato | testo di sostituzione e stile o formattazione                       | `{pino}` → "pino" in verde e grassetto          |
| colore           | un colore con nome                                                  | `{rosso}` usabile in qualsiasi proprietà colore |
| valore           | testo o numero costante                                             | `{max_mano}` → 7                                |

Ogni variabile ha un'anteprima nell'elenco. Rinominare una variabile aggiorna i riferimenti in template e fogli.

Stato attuale: le variabili sono nella sezione "Variabili" della barra laterale, con un editor che mostra l'anteprima in una frase di prova, e si salvano in `gamecreator.json` (docs/formato.md). Le variabili immagine hanno file, tinta, dimensione rispetto alla riga e spostamento verticale; quelle di testo possono contenere markup e richiamare altre variabili; quelle valore entrano nelle formule come i campi; quelle colore valgono in ogni proprietà colore dei livelli e negli attributi del markup (`color=`, `bg-color=`, `fill=`, `border=`, `highlight=`), scritte come `rosso` o `{rosso}`, e compaiono tra i suggerimenti. Rinominare una variabile per ora non aggiorna i riferimenti.

Le immagini nel testo, variabili o file di `assets/`, accettano attributi dopo il nome, che per quel solo uso prevalgono su quelli della variabile: `{spada tint=red size=150% rotate=90 flip=h opacity=50%}`, anche con le ripetizioni (`{spada*3 tint=red}`).

| Attributo  | Esempio       | Effetto                                                                                      |
| ---------- | ------------- | -------------------------------------------------------------------------------------------- |
| `tint=`    | `tint=red`    | ricolora l'immagine; `none` tiene i colori originali, `currentColor` usa il colore del testo |
| `size=`    | `size=150%`   | altezza rispetto alle icone normali (anche `1.5`)                                            |
| `raise=`   | `raise=10`    | spostamento verticale in % della riga; negativo abbassa                                      |
| `rotate=`  | `rotate=90`   | rotazione in gradi, in senso orario                                                          |
| `flip=`    | `flip=h`      | ribaltamento orizzontale (`h`), verticale (`v`), entrambi (`hv`) o `none`                    |
| `opacity=` | `opacity=50%` | opacità                                                                                      |

Se il nome è un campo, il suo valore diventa il nome dell'immagine: con `icona` = `spada`, `{icona tint=red}` dà `{spada tint=red}`. Una variabile immagine usata come sorgente di un livello immagine porta con sé tinta, ribaltamento e opacità; la rotazione è quella del livello.

### 6.2 Stili di testo

Uno stile raggruppa proprietà di carattere (font, peso, corsivo, dimensione, colore, trasformazione, decorazione, contorno) e, se applicato a un intero livello, anche di paragrafo (allineamento, interlinea, spaziature).

- Uno stile può basarsi su un altro ed ereditarne le proprietà non ridefinite.
- Si applica a un intero livello di testo (proprietà `style`), a un paragrafo (`{.name}` a inizio riga) o a una porzione (`[testo]{.name}`).
- Modificare uno stile aggiorna tutte le carte che lo usano.
- La formattazione locale prevale sullo stile.

### 6.3 Colori

- **Nomi predefiniti.** I nomi di colore standard del web (`red`, `yellow`, `blue`, `darkgreen`, ... sono 148 in tutto) funzionano ovunque senza creare variabili.
- **Palette del progetto.** Le variabili di tipo colore formano la palette. Una variabile con lo stesso nome di un colore predefinito lo ridefinisce in tutto il progetto: per esempio `red` = `#A33A2A`.
- **Selettore.** Ogni proprietà colore apre un selettore con campo per il codice (esadecimale, RGB, HSL), area saturazione/luminosità, cursori per tonalità e trasparenza, contagocce, palette del progetto e colori recenti.

## 7. Campi calcolati

Scelta rivista il 2026-10-18: i calcoli stanno nel template, non nei set (vedi docs/requisiti.md).

- **Fonte del valore.** Ogni livello prende il valore principale da una colonna del foglio (di base quella con il suo nome), da un valore fisso o da una formula.
- **Livello valore.** Un livello di tipo `value` non si disegna: contiene un valore della carta che le formule e i testi degli altri livelli usano come `{nome}`. Una colonna con lo stesso nome lo cambia carta per carta; può avere a sua volta una formula. I livelli valore si calcolano in ordine, quindi uno può usare quelli che lo precedono.
- **Campi disponibili.** `{campo}` vale, nell'ordine di precedenza: il livello valore calcolato, la cella non vuota della riga, il valore del livello nel template. Senza dati (nell'editor) le formule mostrano il risultato con i valori del template.
- **Composizione.** Una formula senza `=` iniziale compone testo: `{nome}.png`, `Forza {forza}`. Se contiene `+ - * /` e il risultato è numerico, si calcola: `{forza}+2`.
- **Espressione.** Con `=` iniziale è un'espressione come in Excel: `=IF({forza}>3; "Forte"; "Debole")`. Testi tra virgolette, confronti `= <> < > <= >=`, `&` per unire testi, argomenti separati da `;` o `,`. Funzioni (nomi in inglese): `IF`, `AND`, `OR`, `NOT`, `MIN`, `MAX`, `ABS`, `ROUND`, `FLOOR`, `CEILING`, `UPPER`, `LOWER`, `LEN`, `CONCAT`, `ISBLANK`.
- I campi mancanti e gli errori sono segnalati sotto la carta e nel pannello proprietà.

## 8. Template e set

### 8.1 Template

| Proprietà        | Valori                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| dimensioni       | mm, scelte alla creazione e modificabili; preset: poker 63×88, bridge 57×89, mini 44×63, tarocchi 70×120, quadrata 70×70, segnalino tondo, plancia A4 |
| forma            | rettangolo con raggio, cerchio, esagono, tracciato personalizzato                                                                                     |
| abbondanza       | mm (default 3)                                                                                                                                        |
| area sicura      | mm dal bordo di taglio, solo come guida                                                                                                               |
| retro            | nessuno, unico per il set, per carta (livelli del retro collegati al foglio)                                                                          |
| griglia e guide  | passo in mm, guide manuali                                                                                                                            |
| nome delle carte | campo (colonna o livello) mostrato sotto ogni carta nella vista del set; di base la prima colonna non vuota                                           |

Quando si cambiano le dimensioni di un template che contiene già livelli, l'app chiede cosa fare:

- **ridimensiona in proporzione**: posizioni, dimensioni e testi scalano con il nuovo formato (se le proporzioni cambiano, si sceglie se adattare alla larghezza, all'altezza o deformare);
- **mantieni**: i livelli restano dove sono e si applicano solo i vincoli di ciascun livello (sezione 1);
- **annulla**.

### 8.2 Set

| Proprietà            | Valori                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| template             | uno per set                                                                                                                     |
| foglio               | foglio del file dati                                                                                                            |
| copie                | colonna `amount` (1 se vuota)                                                                                                   |
| viste                | tabella con anteprima; griglia di anteprime (zoom, fronte/retro, filtro, selezione multipla per modifiche in blocco)            |
| ordine delle carte   | manuale, trascinando righe in tabella o carte nella griglia; è l'ordine delle righe nel foglio e quello di esportazione         |
| ordinamento e filtro | per qualsiasi colonna, solo nella vista, senza cambiare l'ordine salvato; si può rendere definitivo con "Applica questo ordine" |

## 9. Esportazione

Le esportazioni si salvano come profili nel progetto, così si possono rilanciare. Ogni profilo indica i set da includere e se rispettare le copie.

Stato (ottobre 2026): il comando **Esporta…** nella barra in alto apre una finestra con tre schede (immagini, PDF, Tabletop Simulator). Le opzioni usate per ultime si salvano in `gamecreator.json` sotto la chiave `export`, una per tipo; i profili con nome restano da fare. Le carte si disegnano in una finestra nascosta con lo stesso codice dell'anteprima, quindi l'esportazione coincide con ciò che si vede, comprese le modifiche non ancora salvate. Le immagini mancanti in `assets/` escono come segnaposto e la finestra elenca le carte coinvolte.

### 9.1 Immagini

| Opzione       | Valori                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| formato       | PNG, JPG (qualità); WebP non ancora                                                                     |
| risoluzione   | 150, 300, 600 DPI o personalizzata                                                                      |
| abbondanza    | inclusa, esclusa                                                                                        |
| lati          | fronte, retro, entrambi                                                                                 |
| sfondo        | fuori dagli angoli arrotondati: bianco o trasparente (PNG, senza abbondanza)                            |
| nome dei file | modello con `%set`, `%n` (posizione nel set), `%copy`, `%side`, `{campo}`; per esempio `%set/%n_{nome}` |

Con fronte e retro senza `%side` nel modello, il lato si aggiunge in fondo al nome (`_front`, `_back`); con le copie succede lo stesso per `%copy`. I nomi ripetuti ricevono `_2`, `_3`.

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

Piegatura e fogli di prova non sono ancora disponibili. Senza abbondanza gli angoli sono arrotondati come nel template; togliendo l'opzione la carta resta un rettangolo. Con l'abbondanza le carte sono sempre rettangolari. Nel fronte-retro i retri si specchiano sulle colonne quando si gira il foglio sul lato lungo di una pagina verticale (o sul lato corto di una orizzontale), altrimenti sulle righe.

Il PDF è vettoriale, con i font incorporati e in RGB. Il CMYK richiesto da alcune tipografie richiede una conversione successiva: da valutare con Ghostscript in un secondo momento.

### 9.3 Tabletop Simulator

| Opzione            | Valori                                                                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| griglia            | automatica per set (righe e colonne scelte in base al numero di carte, per ridurre gli spazi vuoti) oppure fissa, fino a 10×7; l'ultima posizione è riservata alla carta nascosta |
| dimensione massima | 4096 o 8192 px per lato                                                                                                                                                           |
| retro              | unico o foglio dei retri                                                                                                                                                          |
| destinazione       | cartella del progetto, cartella di Tabletop Simulator, entrambe                                                                                                                   |
| oggetto salvato    | file JSON del mazzo pronto da caricare                                                                                                                                            |
| Nickname           | vuoto oppure da un campo a scelta (di base il primo campo di testo, per esempio `nome`)                                                                                           |
| Description        | vuota oppure da un campo a scelta                                                                                                                                                 |

La griglia automatica sceglie, tra 2 × 2 e 10 × 7, quella con meno posizioni vuote e, a parità, il foglio più vicino al quadrato. Le carte non superano 300 DPI. Le copie non si ripetono sul foglio: il mazzo richiama più volte la stessa posizione. Si scrivono `<set>.json` (oggetto salvato), `<set>.png` (miniatura) e i fogli in `images/`; i fogli si richiamano con indirizzi `file:///`, quindi il mazzo funziona sul computer che l'ha esportato. Per giocare online le immagini vanno caricate su un servizio web e gli indirizzi cambiati in Tabletop Simulator. La cartella predefinita di Tabletop Simulator è `~/Library/Tabletop Simulator/Saves/Saved Objects` su macOS, `Documenti/My Games/Tabletop Simulator/Saves/Saved Objects` su Windows; dentro si crea una cartella con il nome del progetto.

### 9.4 Preset per tipografie

Profili precompilati per i servizi di stampa più comuni (una immagine per carta a 300 DPI con abbondanza, nomi file richiesti dal servizio). I parametri esatti vanno verificati sul sito di ciascun servizio prima di definirli.
