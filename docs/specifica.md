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

Stato (ottobre 2026): fusione e vincoli ci sono. I vincoli si applicano quando si cambia il formato del template scegliendo "lascia i livelli"; "scala" ridimensiona il livello in proporzione alla carta. Nei gruppi vale il vincolo di ciascun figlio. Nelle celle il contorno si scrive `colore/spessore/tratteggio`, per esempio `red/0.3/dashed` o `#333/0.5/dotted`.

La dissolvenza dell'opacità (pannello Aspetto) rende il livello trasparente in modo graduale. Si sceglie la direzione (verso il basso, l'alto, destra, sinistra, con un angolo, verso i bordi o verso il centro) e con tre cursori dove comincia, dove finisce e quanto resta visibile alla fine; una barra mostra l'effetto. Non si imposta dal foglio.

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

Stato: ci sono tutte le proprietà della tabella tranne il troncamento con … e la trasformazione in Iniziali, che segue la regola del browser (ogni parola). I margini interni sono uguali sui quattro lati o, con **Margini per lato**, diversi per ciascuno. Senza a capo automatico ogni paragrafo resta su una riga.

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
| `spacing=`                              | `{spacing=50}`                                | spaziatura caratteri in ‰, vale anche per le immagini nel testo                 |
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

Stato attuale: i suggerimenti funzionano nel pannello proprietà, nei campi della carta e nelle celle della tabella (↑↓ per scegliere, Invio o Tab per inserire, Esc per chiudere); gli errori sono elencati sotto il campo e sotto la carta. Mentre si scrive, il campo colora il markup: graffe e quadre, nomi di campi e variabili, stili, attributi e valori, segni Markdown e caratteri letterali; gli errori sono sottolineati. Tra i suggerimenti le variabili immagine mostrano l'icona, e sotto l'elenco si vede l'anteprima della variabile scelta: l'icona, il testo già formattato, il colore o il valore.

#### Editor del formato e degli stili

Nei campi del pannello e della carta, il pulsante "Aa Formatta…" apre un editor visuale degli attributi: si seleziona del testo (che diventa `[testo]{...}`) oppure si mette il cursore dentro una porzione `[testo]{...}` esistente per modificarla. L'editor mostra un'anteprima, i campi per ciascun attributo e il testo degli attributi come si scrive, sincronizzato. "Rimuovi formattazione" toglie le parentesi; "Salva come stile…" salva gli attributi come stile del progetto e sostituisce la formattazione con `{.nome}`.

Gli stili del progetto sono elencati nella sezione "Stili" della barra laterale e si modificano con lo stesso editor; uno stile del progetto con il nome di uno predefinito lo sostituisce. Rinominare uno stile aggiorna i testi che lo usano (`{.nome}`, `[testo]{.nome}`), lo stile dei livelli e gli stili che si basano su di esso.

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

### 2.3 Font

Un font si indica con il nome della famiglia (`Cinzel`, `Open Sans`), nel livello o nel markup (`font=Open_Sans`).

- I file di font del progetto stanno in `assets/fonts/` (`.ttf`, `.otf`, `.woff`, `.woff2`), anche in sottocartelle. All'apertura del progetto l'app legge da ogni file famiglia, peso e stile, compresi i font variabili, e li usa in anteprima e nell'esportazione; dopo aver copiato un font serve **Ricarica**. Se un file non si legge, la famiglia è il nome della sottocartella (`fonts/Open Sans/...`) o la parte del nome del file prima di `-`.
- Nunito, il font predefinito, è incluso nell'app e funziona senza rete.
- Anche i font installati sul computer si possono usare, ma un progetto che li usa non si vede uguale su un altro computer: conviene copiarli in `assets/fonts/` quando la licenza lo permette.
- Un font che non è né nel progetto, né nell'app, né installato viene segnalato sotto la carta, sotto il campo del font e al termine dell'esportazione. Il testo usa intanto un font predefinito.

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

Stato: **ripeti** affianca l'immagine alla sua dimensione originale (300 DPI per le immagini raster), a partire dalla posizione data dall'allineamento interno; lo zoom cambia la dimensione delle piastrelle. Le regolazioni si applicano prima della tinta. Il contorno può essere continuo, tratteggiato o a punti, come quello delle forme.

### 3.1 Risoluzione dei nomi di file

Ovunque si indichi un'immagine (livello, campo, formula, variabile, `bg=`) basta il nome del file, senza percorso e senza estensione. Accanto al campo dell'immagine, nel pannello delle proprietà e nei campi della carta, un pulsante apre le miniature delle immagini di `assets/`, con ricerca approssimata per nome e filtro per cartella; un clic scrive il nome.

1. Si cerca in tutto `assets/`, sottocartelle comprese.
2. Un nome con estensione (`spada.png`) o con percorso (`icone/spada`) vale così com'è.
3. Senza estensione si accettano `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`.
4. Se il nome corrisponde a più file (`spada.png` e `spada.svg`, oppure `spada.png` in due sottocartelle) l'app non sceglie da sola: segnala l'ambiguità sulla carta e in tabella, e chiede di aggiungere estensione o percorso.
5. Una variabile immagine con lo stesso nome di un file prevale sul file.

## 4. Forma

| Proprietà     | Valori                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| tipo          | rettangolo, ellisse, poligono regolare (n lati), stella (n punte, rapporto interno), linea, da un'immagine |
| raggio angoli | mm, uguale o diverso per ogni angolo                                                                       |
| riempimento ◆ | nessuno, colore, gradiente lineare o radiale, immagine ripetuta                                            |
| contorno ◆    | colore, spessore, posizione (interno, centrato, esterno), tratteggio, terminazioni                         |
| punti         | modificabili sulla tela per poligoni e tracciati                                                           |

Stato (ottobre 2026): il riempimento accetta un colore o un gradiente in sintassi CSS, sia nel pannello sia nelle celle: `linear-gradient(90deg, #A33A2A, #FFD27A 70%)` o `radial-gradient(white, rosso)`. Nei gradienti si possono usare le variabili di colore. Il passaggio tra due colori è ammorbidito: si mescolano in OKLab con un'accelerazione graduale, così il centro non si spegne e non si vede uno spigolo sui colori intermedi. La linea va da un punto A a un punto B: si trascinano gli estremi sulla carta (Maiuscolo tiene l'angolo a scatti di 15°) o si scrivono le coordinate. La forma "da un'immagine" usa la sagoma di una PNG con trasparenza o di una SVG del progetto (nelle immagini senza trasparenza, le parti scure); l'altezza segue le proporzioni dell'immagine. L'immagine ripetuta come riempimento non c'è: si ottiene con un livello immagine in modalità "ripeti".

## 5. Gruppo

| Proprietà               | Valori                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| figli                   | qualsiasi livello, compresi altri gruppi                                                                        |
| ritaglia ai bordi       | sì/no; con il primo figlio come maschera                                                                        |
| disposizione automatica | nessuna, riga, colonna, griglia; spaziatura e allineamento                                                      |
| ripetizione ◆           | ripete il contenuto N volte, con N fisso o da un campo (per esempio un'icona di forza ripetuta `{forza}` volte) |

Stato (ottobre 2026): disposizione e ripetizione ci sono. Con la disposizione il riquadro del gruppo diventa l'area in cui i figli si mettono, uno dopo l'altro nell'ordine del pannello livelli, con la spaziatura scelta. "Contenuto" sposta l'insieme all'inizio, al centro o alla fine dell'area (nella griglia in entrambe le direzioni); "ogni figlio" allinea ciascun figlio nell'altra direzione. I figli tengono la loro misura e quelli nascosti non occupano spazio; nella griglia le celle hanno la misura del figlio più grande.

"Ripeti" accetta un numero o un campo, per esempio `{forza}`, e si può cambiare anche dalla colonna `nome.repeat`. Una cella vuota vale 0; nel template senza dati un campo vale 1. Le copie seguono la disposizione; senza disposizione l'insieme dei figli si ripete in riga. Con "ritaglia" la maschera resta ferma e non si ripete. Nell'editor le copie si vedono ma non si selezionano: si modifica il primo esemplare.

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

Stato attuale: le variabili sono nella sezione "Variabili" della barra laterale, con un editor che mostra l'anteprima in una frase di prova, e si salvano in `gamecreator.json` (docs/formato.md). Le variabili immagine hanno file, tinta, dimensione rispetto alla riga e spostamento verticale; quelle di testo possono contenere markup e richiamare altre variabili; quelle valore entrano nelle formule come i campi; quelle colore valgono in ogni proprietà colore dei livelli e negli attributi del markup (`color=`, `bg-color=`, `fill=`, `border=`, `highlight=`), scritte come `rosso` o `{rosso}`, e compaiono tra i suggerimenti. Rinominare una variabile aggiorna i richiami nei template, nelle celle dei fogli, nelle altre variabili e negli stili (`{nome}`, `{nome*3}`, `color=nome`, e il nome senza graffe nelle proprietà colore e immagine); dove un campo ha lo stesso nome, `{nome}` è il campo e resta com'è. ⌘Z annulla la rinomina. Una variabile immagine con tinta "colore del testo" (`currentColor`) prende il colore del testo in cui è inserita.

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
- **Campi disponibili.** `{campo}` vale, nell'ordine di precedenza: il livello valore calcolato, la cella non vuota della riga, il valore del livello nel template. Senza dati (nell'editor) le formule mostrano il risultato con i valori del template. Una cella vuota lascia il valore del template; una cella con soli spazi lo svuota (per le colonne delle proprietà, come `titolo.size`, conta come vuota).
- **Composizione.** Una formula senza `=` iniziale compone testo: `{nome}.png`, `Forza {forza}`. Se contiene `+ - * /` e il risultato è numerico, si calcola: `{forza}+2`.
- **Espressione.** Con `=` iniziale è un'espressione come in Excel: `=IF({forza}>3; "Forte"; "Debole")`. Testi tra virgolette, confronti `= <> < > <= >=`, `&` per unire testi, argomenti separati da `;` o `,`. Funzioni (nomi in inglese): `IF`, `AND`, `OR`, `NOT`, `MIN`, `MAX`, `ABS`, `ROUND`, `FLOOR`, `CEILING`, `UPPER`, `LOWER`, `LEN`, `CONCAT`, `ISBLANK`.
- I campi mancanti e gli errori sono segnalati sotto la carta e nel pannello proprietà.

## 8. Template e set

### 8.1 Template

| Proprietà        | Valori                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| dimensioni       | mm, scelte alla creazione e modificabili; preset: poker 63×88, bridge 57×89, mini 44×63, tarocchi 70×120, quadrata 70×70, segnalino tondo, plancia A4 |
| forma            | rettangolo con raggio, cerchio, esagono, sagoma di un'immagine                                                                                        |
| abbondanza       | mm (default 3)                                                                                                                                        |
| area sicura      | mm dal bordo di taglio, solo come guida                                                                                                               |
| retro            | nessuno, unico per il set, per carta (livelli del retro collegati al foglio)                                                                          |
| griglia e guide  | passo in mm, guide manuali                                                                                                                            |
| nome delle carte | campo (colonna o livello) mostrato sotto ogni carta nella vista del set; di base la prima colonna non vuota                                           |

Quando si cambiano le dimensioni di un template che contiene già livelli, l'app chiede cosa fare:

- **ridimensiona in proporzione**: posizioni, dimensioni e testi scalano con il nuovo formato (se le proporzioni cambiano, si sceglie se adattare alla larghezza, all'altezza o deformare);
- **mantieni**: i livelli restano dove sono e si applicano solo i vincoli di ciascun livello (sezione 1);
- **annulla**.

Accanto a larghezza e altezza, sia del template (nel pannello proprietà e nella finestra del nuovo template) sia dei livelli, un lucchetto mantiene le proporzioni: chiuso, cambiando una misura l'altra segue. Sul livello vale anche per le maniglie sulla carta, comprese quelle sui lati (l'altra misura cresce centrata); senza lucchetto Maiuscolo tiene le proporzioni solo per il trascinamento in corso. Lo stato del lucchetto è una preferenza dell'interfaccia, ricordata per tipo di livello e per i template.

Stato (ottobre 2026): la forma della carta può essere rettangolo con raggio, cerchio o ellisse, esagono (con i lati piatti in alto se la carta è più larga che alta, con le punte in alto altrimenti) o la sagoma di un'immagine del progetto (PNG con trasparenza o SVG), salvata come tracciato SVG in coordinate 0–1. La forma ritaglia la carta nell'editor, nelle anteprime, nelle immagini e nel PDF senza abbondanza; con l'abbondanza la carta resta rettangolare e la forma compare come linea di taglio, perché la tipografia la ritaglia da lì. L'area sicura segue la forma. In Tabletop Simulator il mazzo resta di carte rettangolari, con la forma disegnata all'interno. Le guide manuali si aggiungono dal pannello del template (verticali e orizzontali), si spostano trascinandole sulla carta e si tolgono trascinandole fuori; i livelli vi si agganciano quando è attivo l'aggancio agli oggetti, e una guida trascinata si aggancia ai lati e al centro della carta e dell'area sicura.

Le voci della barra laterale (set, template, stili, variabili) si riordinano trascinandole; ⌘Z annulla. Quando un elenco non è in ordine alfabetico, accanto al + compare **A–Z**, che lo riporta in ordine alfabetico. L'ordine si salva nel progetto (docs/formato.md).

### 8.2 Set

| Proprietà            | Valori                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| template             | uno per set                                                                                                                     |
| foglio               | foglio del file dati                                                                                                            |
| copie                | colonna `amount` (1 se vuota)                                                                                                   |
| viste                | tabella con anteprima; griglia di anteprime (zoom, fronte/retro, filtro, selezione multipla per modifiche in blocco)            |
| ordine delle carte   | manuale, trascinando righe in tabella o carte nella griglia; è l'ordine delle righe nel foglio e quello di esportazione         |
| ordinamento e filtro | per qualsiasi colonna, solo nella vista, senza cambiare l'ordine salvato; si può rendere definitivo con "Applica questo ordine" |

- Ordinamento e filtro: nella tabella un clic sull'intestazione ordina per quella colonna (crescente, decrescente, poi l'ordine del foglio); nella griglia si sceglie la colonna dal menu. I numeri si ordinano come numeri, i testi senza markup, maiuscole e accenti, le celle vuote vanno in fondo. Il filtro cerca il testo in tutte le colonne o in una sola. Con ordinamento o filtro attivi le righe non si trascinano; **Applica questo ordine** riordina il foglio (⌘Z annulla), **Mostra tutto** torna alla vista normale.
- Il template del set si cambia dal menu nell'intestazione del set; i dati restano gli stessi, e le colonne che il nuovo template non usa vengono ignorate. ⌘Z annulla.
- Sotto l'anteprima della carta, **Modifica template** apre nell'editor il template del set.
- Il cestino accanto a un set lo toglie dal progetto dopo una conferma. Il foglio dei dati resta nel file, tra quelli non collegati, e si può ricollegare con **Nuovo set**; ⌘Z annulla.
- Il cestino accanto a un template lo elimina dopo una conferma, spostando il file nel cestino del sistema. Un template usato da un set non si elimina: prima vanno eliminati i set che lo usano.

## 9. Esportazione

Le esportazioni si salvano come profili nel progetto, così si possono rilanciare. Ogni profilo indica i set da includere e se rispettare le copie.

Stato (ottobre 2026): il comando **Esporta…** nella barra in alto apre una finestra con tre schede (immagini, PDF, Tabletop Simulator). Le opzioni usate per ultime si salvano in `gamecreator.json` sotto la chiave `export`, una per tipo. In cima alla finestra, **Profilo** sceglie un profilo con nome, il cui tipo e le cui opzioni (set e cartella compresi) passano nella finestra; **Salva** aggiorna il profilo scelto con le opzioni attuali, **Salva come…** ne crea uno nuovo e × lo elimina. I profili si scrivono subito nel progetto, sotto `export.named`. Le carte si disegnano in una finestra nascosta con lo stesso codice dell'anteprima, quindi l'esportazione coincide con ciò che si vede, comprese le modifiche non ancora salvate. Le immagini mancanti in `assets/` escono come segnaposto e la finestra elenca le carte coinvolte.

**Anteprima…**, accanto a **Esporta**, mostra uno alla volta i file che l'esportazione scriverà con le opzioni attuali, senza scrivere nulla: le immagini delle carte con il nome del file, le pagine del PDF con i segni di taglio, i fogli di Tabletop Simulator con la carta nascosta. Si scorrono con ‹ › o con le frecce, e da lì si può esportare. L'anteprima e l'esportazione usano lo stesso piano (`src/shared/exportPlan.ts`), quindi impaginazione e nomi coincidono.

### 9.1 Immagini

| Opzione       | Valori                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| formato       | PNG, JPG, WebP (qualità per JPG e WebP)                                                                 |
| risoluzione   | 150, 300, 600 DPI o personalizzata                                                                      |
| abbondanza    | inclusa, esclusa                                                                                        |
| lati          | fronte, retro, entrambi                                                                                 |
| sfondo        | fuori dagli angoli arrotondati: bianco o trasparente (PNG e WebP, senza abbondanza)                     |
| nome dei file | modello con `%set`, `%n` (posizione nel set), `%copy`, `%side`, `{campo}`; per esempio `%set/%n_{nome}` |

Con fronte e retro senza `%side` nel modello, il lato si aggiunge in fondo al nome (`_front`, `_back`); con le copie succede lo stesso per `%copy`. I nomi ripetuti ricevono `_2`, `_3`.

### 9.2 PDF di stampa

| Opzione              | Valori                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| pagina               | A4, A3, Letter, personalizzata; verticale, orizzontale                                                                    |
| margini e spaziatura | mm                                                                                                                        |
| disposizione         | automatica (massimo di carte per pagina) o righe × colonne                                                                |
| rotazione            | con la disposizione automatica, carte ruotate di 90° se dritte non entrano nella pagina o ne entrano di più               |
| abbondanza           | inclusa o no; se inclusa le carte si toccano e i segni di taglio sono esterni                                             |
| segni di taglio      | nessuno, angoli, linee intere; lunghezza, spessore, colore, sopra o sotto le carte                                        |
| fronte-retro         | nessuno; pagine alternate con retro speculari (rilegatura lato lungo o corto); compensazione del disallineamento x e y    |
| poster               | le carte più grandi della pagina si dividono su più pagine che si sovrappongono (mm), con il nome di ogni parte (A1, B1…) |
| piegatura            | fronte e retro affiancati sulla stessa pagina, con linea di piegatura                                                     |
| file                 | unico, uno per set, uno per lato                                                                                          |
| fogli di prova       | PDF a parte con tutte le carte in piccolo, con set e numero                                                               |

Il poster vale con la disposizione automatica: una carta che non entra nella pagina, nemmeno ruotata, si divide in parti uguali che si sovrappongono almeno quanto indicato (di base 10 mm), scegliendo l'orientamento con meno pagine. Ogni pagina porta i segni di taglio della carta dove cadono, dei trattini corti nei margini dove comincia la parte accanto e, sotto, il nome della parte con set e numero della carta. I retri seguono come pagine a parte, senza fronte-retro. Le carte ruotate girano in senso orario; nel fronte-retro i retri ruotano in modo da combaciare con i fronti quando si gira il foglio. Senza abbondanza gli angoli sono arrotondati come nel template; togliendo l'opzione la carta resta un rettangolo. Con l'abbondanza le carte sono sempre rettangolari. Nel fronte-retro i retri si specchiano sulle colonne quando si gira il foglio sul lato lungo di una pagina verticale (o sul lato corto di una orizzontale), altrimenti sulle righe.

Con la piegatura ogni carta occupa una cella larga il doppio, con il fronte a sinistra e il retro a destra, entrambi dritti: piegando lungo i trattini (sopra e sotto la coppia) il retro finisce dietro il fronte. Con l'abbondanza la coppia la ha solo all'esterno; senza, le carte sono rettangoli di taglio. Fronte-retro, scelta dei lati, rotazione e poster non valgono.

Il foglio di prova è un PDF in più (`nome_proof.pdf`) con tutte le carte del set in piccolo, una per riga del foglio senza copie, con set e numero sotto; i retri compaiono se si esportano.

Il PDF è vettoriale, con i font incorporati e in RGB. **Converti in CMYK** passa il PDF a Ghostscript (`-sColorConversionStrategy=CMYK`), se è installato sul computer (cercato nel PATH e nelle cartelle di Homebrew). Senza Ghostscript, o se la conversione non riesce, il PDF resta RGB e la finestra lo segnala. La conversione usa il profilo predefinito di Ghostscript: per un profilo colore preciso della tipografia serve ancora un programma di prestampa.

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

Nello stesso menu dei profili, un gruppo di preset per i servizi di stampa e per la stampa in casa. Un preset cambia tipo e opzioni ma lascia i set e la cartella scelti; non si modifica, ma si può salvare come profilo del progetto e cambiare da lì.

| Preset                                  | Opzioni                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| MakePlayingCards, un'immagine per carta | PNG a 300 DPI con abbondanza, fronte e retro, senza copie, fronti e retri in cartelle separate (`%set/%side/%n`) |
| The Game Crafter, un'immagine per carta | PNG a 300 DPI con abbondanza, fronte e retro, senza copie (`%set/%n_%side`)                                      |
| Stampa in casa, A4 o Letter             | PDF fronte-retro (lato lungo), senza abbondanza, segni di taglio agli angoli, con le copie                       |

La dimensione in pixel dipende dal template. MakePlayingCards chiede per le carte poker almeno 822 × 1122 px a 300 DPI, cioè 36 px (3,05 mm) di abbondanza per lato; The Game Crafter stampa a 300 DPI con 1/8" (3,2 mm) di abbondanza e altrettanto di area sicura. I 3 mm predefiniti dei template vanno bene per entrambi: una carta 63 × 88 con 3 mm esce a 815 × 1110 px. Prima di ordinare conviene controllare le specifiche sul sito del servizio, che possono cambiare.

## 10. Icone, font e crediti

Proposta completa e motivazioni in `proposta-icone-font.md` (cartella condivisa del progetto). I cataloghi stanno nell'app (`resources/catalogs/`), quindi la ricerca funziona anche senza rete; si rigenerano con gli script in `scripts/`. Quello che si importa finisce in `assets/` e da lì in poi è un file come gli altri: il progetto resta autonomo e si apre anche su un altro computer.

### 10.1 Icone di game-icons.net

Dalla finestra di scelta delle immagini e dalla finestra di una variabile icona, **Importa icone…** apre il catalogo di game-icons.net (circa 4200 icone, 36 autori), costruito dal repository ufficiale per avere l'autore di ogni icona.

- A sinistra i tag del sito (134, in 19 gruppi), tradotti in italiano; i tag sono stati raccolti una volta dalle pagine del sito e si aggiornano con `scripts/fetch-icon-tags.mjs`.
- La ricerca è approssimata (tollera errori di battitura) e guarda il nome inglese dell'icona, i tag in inglese e in italiano, alcune parole italiane associate ai tag (per esempio "spada" per le lame) e l'autore. Il nome dell'icona pesa più dei tag.
- La tinta e lo sfondo scuro servono solo all'anteprima: il file si salva nero, e il colore sulla carta si sceglie con il livello come per ogni SVG.
- Si possono scegliere più icone e rinominarle prima di importarle. Un nome non valido o ripetuto blocca l'importazione; se il file esiste già o il nome breve diventa ambiguo, compare un avviso ma si può procedere.
- Importando una sola icona, la si assegna subito al livello o alla variabile; una variabile nuova senza nome prende il nome dell'icona.
- Le icone si salvano in `assets/icons/<nome>.svg` (viewBox 512 × 512, un solo tracciato) con una voce in `assets/sources.json`.

Licenza: CC BY 3.0, tranne due autori in CC0. CC BY chiede di citare l'autore: vedi 10.3.

### 10.1.1 Raccolte Kenney

Nella stessa finestra, sopra la ricerca, si sceglie la raccolta: game-icons.net oppure due raccolte di Kenney (kenney.nl), costruite dai pacchetti ufficiali con `scripts/make-kenney-catalogs.mjs`.

- **Icone e motivi**: le 255 icone di Board Game Icons, in 10 categorie (carte, dadi, pedine, segnalini...), e i 168 motivi ripetibili di Pattern Pack e Pattern Pack Extra. Diventano SVG a un colore come quelle di game-icons.net, quindi si colorano con la tinta. I motivi occupano tutto il riquadro, senza margine, perché affiancati non mostrino giunture; il bianco originale diventa trasparente.
- **Carte, dadi e pedine**: le 523 immagini PNG del Boardgame Pack (carte da gioco, fiches, dadi, pedine in sette colori). Si salvano in `assets/images/` così come sono e non si ricolorano. Sono piccole (64 px i dadi, 140 × 190 px le carte): in stampa vanno usate a dimensioni ridotte.

Licenza: CC0, non serve citare l'autore. La voce in `assets/sources.json` resta comunque, con il pacchetto di provenienza.

### 10.2 Font di Google Fonts

Il pulsante **Aa** accanto al campo del font apre una finestra con due schede:

- **Progetto**: i font in `assets/fonts/` più quelli dell'app, con l'anteprima del testo di prova; un clic sceglie la famiglia.
- **Google Fonts**: il catalogo (circa 1900 famiglie) con filtro per categoria e ricerca approssimata. L'anteprima si scarica da Google mentre si scorre, quindi richiede la rete. Aprendo una famiglia si scelgono pesi e corsivi (di base normale e grassetto, più il corsivo se c'è) e **Scarica** salva i file in `assets/fonts/<Famiglia>/` insieme al testo della licenza, aggiunge le voci a `assets/sources.json` e assegna la famiglia al livello.

Si scaricano file TTF statici, uno per peso: nel PDF si incorporano come TrueType, mentre i font variabili diventerebbero Type 3. I font installati sul computer non compaiono nell'elenco: si possono scrivere a mano nel campo, ma per esportare su un altro computer conviene copiarli in `assets/fonts/`. Le licenze di Google Fonts (OFL, Apache, UFL) permettono l'uso nei giochi stampati; per circa 160 famiglie il catalogo non indica la licenza, che si ricava al momento del download.

### 10.3 Crediti

Nella finestra di esportazione, **Crediti…** compone il testo da mettere nel regolamento o sulla scatola a partire da `assets/sources.json`: le icone raggruppate per fonte, licenza e autore, poi i font con la loro licenza. Di base si citano solo i file usati dalle carte; togliendo la spunta si citano tutti quelli importati. Il testo si copia o si salva in `export/credits.txt`. Le immagini copiate a mano in `assets/` non sono elencate.

## 11. Schermata di ingresso

All'avvio l'app mostra la schermata di ingresso, non l'ultimo progetto aperto. Contiene:

- **Nuovo progetto…**: chiede nome e posizione (predefinita `Documenti/GameCreator`, poi l'ultima usata) e crea la cartella `<posizione>/<nome>` con `gamecreator.json` e le cartelle `data/`, `templates/` e `assets/`. Il file dati `data/cards.xlsx` si scrive al primo salvataggio di un set. Dal nome della cartella si tolgono i caratteri non validi nei nomi di file; la cartella deve essere nuova o vuota.
- **Apri progetto…**: sceglie una cartella che contiene `gamecreator.json`.
- **Importa da Tabletop Creator…**: converte un progetto Tabletop Creator in un progetto nuovo, senza modificare l'originale.
- **Progetti recenti**: fino a 24, dal più recente, con miniatura, nome, data dell'ultima apertura e cartella. Un progetto spostato o cancellato resta nell'elenco come "cartella non trovata"; la × toglie un progetto dall'elenco senza toccare la cartella.

La miniatura è la prima carta del primo set che ha carte (altrimenti il primo template), disegnata come nell'esportazione. Si crea alla prima apertura e si aggiorna a ogni salvataggio. Elenco e miniature stanno nei dati dell'app (`recent-projects.json` e `thumbnails/` nella cartella dati utente di Electron), non nel progetto: aprire un progetto non scrive nulla nella sua cartella.

Nel progetto, la barra in alto ha nome e cartella del progetto, **Esporta…** e, vicini, **Salva**, **Ricarica** e **Chiudi**; **Chiudi** torna alla schermata di ingresso e chiede conferma se ci sono modifiche non salvate.
