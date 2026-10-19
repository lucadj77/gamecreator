# Guida all'uso di Naibi

Naibi è un'app per creare carte e altri elementi di gioco stampati a partire da un foglio di calcolo. Si disegna una volta il modello della carta, il **template**, e ogni riga del foglio diventa una carta. Le carte si esportano come immagini, come PDF da stampare o come mazzi per Tabletop Simulator.

Questa guida segue l'ordine in cui di solito si lavora: creare un progetto, disegnare un template, inserire le carte, rifinire testi e immagini, esportare. Gli esempi vengono da un piccolo progetto con tre set: personaggi, oggetti e carte mercato.

English version: [../guide/README.md](../guide/README.md).

## Indice

1. [Concetti di base](#1-concetti-di-base)
2. [Schermata di ingresso](#2-schermata-di-ingresso)
3. [La finestra del progetto](#3-la-finestra-del-progetto)
4. [Disegnare un template](#4-disegnare-un-template)
5. [Inserire e modificare le carte](#5-inserire-e-modificare-le-carte)
6. [Testo e markup](#6-testo-e-markup)
7. [Variabili e stili](#7-variabili-e-stili)
8. [Immagini, icone e font](#8-immagini-icone-e-font)
9. [Formule e campi calcolati](#9-formule-e-campi-calcolati)
10. [Generare le carte](#10-generare-le-carte)
11. [Esportare](#11-esportare)
12. [Backup](#12-backup)
13. [Importare da Tabletop Creator](#13-importare-da-tabletop-creator)
14. [Lavorare con un agente IA](#14-lavorare-con-un-agente-ia)
15. [I file del progetto](#15-i-file-del-progetto)
16. [Scorciatoie da tastiera](#16-scorciatoie-da-tastiera)

## 1. Concetti di base

| Termine       | Cos'è                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **progetto**  | una cartella sul disco con il file `naibi.json`, il file dei dati, i template e gli asset                                             |
| **template**  | il disegno di una carta: formato, abbondanza e una pila di **livelli** (testi, immagini, forme, gruppi), per il fronte e per il retro |
| **set**       | un gruppo di carte che usano lo stesso template; corrisponde a un foglio del file dati (`data/carte.xlsx`)                            |
| **livello**   | un elemento del template. Il nome del livello è anche il nome della colonna del foglio da cui prende il valore                        |
| **asset**     | immagini, icone e font del progetto, nella cartella `assets/`                                                                         |
| **variabile** | un nome che si richiama nei testi con `{nome}`: un'icona, un testo formattato, un colore o un valore                                  |
| **stile**     | un insieme di attributi del testo con un nome, da applicare a un livello, a un paragrafo o a una parola                               |

Il collegamento tra dati e disegno è sempre lo stesso: nel template il livello di testo `nome` mostra, su ogni carta, il contenuto della colonna `nome` della riga corrispondente.

Le misure sono in millimetri, le dimensioni del testo in punti. Le parole chiave del markup e delle formule sono in inglese e non cambiano con la lingua dell'interfaccia.

## 2. Schermata di ingresso

All'avvio Naibi mostra la schermata di ingresso.

![La schermata di ingresso con un progetto recente](img/ingresso.png)

- **Nuovo progetto…** crea una cartella vuota con la struttura di un progetto.
- **Apri progetto…** apre una cartella che contiene `naibi.json`.
- **Importa da Tabletop Creator…** converte un progetto di Tabletop Creator ([capitolo 13](#13-importare-da-tabletop-creator)).
- **Strumenti IA…** prepara un agente IA a lavorare sui progetti ([capitolo 14](#14-lavorare-con-un-agente-ia)).
- **Progetti recenti** mostra fino a 24 progetti, con la prima carta come miniatura. La × toglie un progetto dall'elenco senza cancellare la cartella.

In alto a destra si scelgono la dimensione dell'interfaccia, il tema (chiaro, scuro o quello del sistema) e la lingua (inglese o italiano).

Per creare un progetto si scrivono il nome e la posizione. Di base la posizione è `Documenti/Naibi`; il file dei dati può essere Excel (`.xlsx`, consigliato) o OpenDocument (`.ods`).

![La finestra per creare un nuovo progetto](img/nuovo-progetto.png)

Un progetto nuovo è vuoto: l'app suggerisce di creare prima un template e poi un set che lo usa.

## 3. La finestra del progetto

![La finestra del progetto, con le parti numerate](img/progetto.png)

1. **Barra in alto.** Nome e cartella del progetto, **Esporta…**, **Backup…**, **Strumenti IA…**, **Salva** (⌘S), **Ricarica** (rilegge il progetto dal disco, perdendo le modifiche non salvate) e **Chiudi**.
2. **Set.** Un clic apre le carte del set; il numero è il totale delle carte, copie comprese.
3. **Template.** Un clic apre il template nell'editor; accanto c'è il formato in millimetri.
4. **Stili** di testo del progetto ([capitolo 7](#7-variabili-e-stili)).
5. **Variabili** del progetto, con un'anteprima.
6. **Carte del set**, in tabella o in griglia.
7. **Anteprima** della carta selezionata, fronte o retro. **Modifica template** apre il template del set.
8. **Campi della carta** selezionata, modificabili come le celle della tabella.

Le voci della barra laterale si riordinano trascinandole; il + accanto a ciascun titolo crea un elemento nuovo. Soffermando il mouse su una voce compare un'anteprima: le prime carte di un set, fronte e retro di un template, una frase con lo stile, l'icona o il colore di una variabile. Il pulsante in alto a sinistra riduce la barra a sole icone, e le frecce accanto ai titoli dei pannelli li spostano dall'altro lato della finestra.

Le modifiche restano in memoria finché non si salva. Il pulsante **Salva** diventa **Salvato** quando non c'è nulla da scrivere.

## 4. Disegnare un template

### 4.1 Creare un template

Il + accanto a **Template** apre la finestra del nuovo template: nome, formato (poker, bridge, mini, tarocchi, quadrata, A6 o personalizzato) e misure. Il lucchetto tra larghezza e altezza mantiene le proporzioni.

![La finestra del nuovo template](img/nuovo-template.png)

### 4.2 L'editor

![L'editor dei template, con le parti numerate](img/editor.png)

1. **Strumenti** per aggiungere un livello: testo (T), immagine, rettangolo (R), ellisse (E), poligono, stella, linea e valore (#). **Fronte** e **Retro** passano da un lato all'altro della carta; le frecce annullano e ripetono.
2. **Livelli**, dall'alto in basso come si sovrappongono sulla carta. Accanto a ogni livello c'è la fonte del valore (colonna del foglio o _fx_ per una formula), il lucchetto e l'occhio per nasconderlo.
3. **Tela** con la carta. Il tratteggio rosso è il bordo di taglio, l'area esterna è l'abbondanza, il tratteggio azzurro l'area sicura.
4. **Proprietà** del livello selezionato, o del template se non è selezionato nulla.
5. **Barra della tela**: mostra o nasconde abbondanza, area sicura e griglia, sceglie a cosa agganciarsi (griglia, oggetti) e regola lo zoom.
6. **Dati**: disegna la tela con i valori di una carta di un set, invece dei valori del template.

Sulla tela i livelli si spostano trascinandoli, si ridimensionano con le maniglie e si ruotano con la maniglia rotonda in alto (Maiuscolo per scatti di 15°). Durante il trascinamento i bordi si agganciano alla griglia, agli altri livelli e alle guide; tenendo premuto Alt si trascina liberamente. Le frecce della tastiera spostano il livello di 0,5 mm, con Maiuscolo di 5 mm.

Nell'elenco dei livelli si trascina un livello per cambiarne l'ordine, o sul centro di un gruppo per metterlo dentro. Con Maiuscolo o ⌘ si selezionano più livelli; ⌘G li raggruppa.

### 4.3 Le proprietà del template

Senza livelli selezionati, il pannello mostra le proprietà del template: misure, abbondanza (di base 3 mm), margine dell'area sicura, forma della carta (rettangolo con angoli arrotondati, cerchio o ellisse, esagono, sagoma presa da un'immagine), guide manuali e **Nome delle carte**, il campo che compare sotto ogni carta nella griglia.

Quando si cambiano le misure di un template che ha già dei livelli, l'app chiede se scalare i livelli in proporzione o lasciarli dove sono. Nel secondo caso ogni livello segue i suoi **vincoli** (resta a sinistra, segue il bordo destro, si allarga con la carta e così via).

### 4.4 Le proprietà dei livelli

Il pannello delle proprietà è diviso in sezioni. Ogni sezione mostra le voci più usate e raccoglie le altre in **Avanzate**. Passando con il mouse su una voce compare una freccia che la sposta in Avanzate o la riporta fuori; la disposizione vale per tutti i progetti.

Nei campi numerici si può trascinare l'etichetta a destra o a sinistra per cambiare il valore come con un cursore (Maiuscolo per passi più grandi, Alt per passi più fini); rotazione e opacità hanno anche un cursore accanto alla casella.

<table>
<tr>
<td width="33%"><img src="img/proprieta-testo.png" alt="Proprietà di un livello di testo, con le Avanzate aperte"></td>
<td width="33%"><img src="img/proprieta-immagine.png" alt="Proprietà di un livello immagine"></td>
<td width="33%"><img src="img/proprieta-forma.png" alt="Proprietà di una forma"></td>
</tr>
<tr>
<td>Testo</td>
<td>Immagine</td>
<td>Forma</td>
</tr>
</table>

In cima a ogni livello ci sono il **nome**, che è anche il nome della colonna del foglio, e il **valore sulle carte**:

- **Colonna del foglio**: di base quella con lo stesso nome del livello. Una cella vuota lascia il valore scritto nel template.
- **Fisso**: lo stesso valore su tutte le carte.
- **Formula**: il valore si calcola dagli altri campi della carta ([capitolo 9](#9-formule-e-campi-calcolati)).

Le proprietà principali per tipo di livello:

- **Testo**: contenuto, stile, font, peso, dimensione, colore, allineamento orizzontale e verticale, interlinea, adattamento (riduci per stare nel riquadro, taglia al bordo, lascia uscire). In Avanzate spaziature, rientro, margini interni, maiuscole, sottolineato, barrato, a capo automatico e contorno delle lettere.
- **Immagine**: nome del file o della variabile, adattamento (riempi ritagliando, adatta dentro, allunga, dimensione originale, ripeti), allineamento, zoom, rotazione dell'immagine dentro il riquadro, spostamento e colorazione. In Avanzate riflessioni, regolazioni (scala di grigi, luminosità, contrasto, saturazione), raggio, contorno e cosa fare se l'immagine manca.
- **Forma**: tipo, riempimento (nessuno, colore o sfumatura lineare o radiale), contorno (continuo, tratteggiato, a punti) e raggio degli angoli. Poligoni e stelle hanno il numero di lati o punte; la linea va da un punto A a un punto B; la forma "da un'immagine" prende la sagoma di una PNG con trasparenza o di una SVG.
- **Gruppo**: può disporre i figli in riga, in colonna o in griglia, ripeterli un numero di volte fisso o preso da un campo (per esempio `{forza}` icone) e usare il livello più in basso come maschera.

Per tutti i livelli ci sono posizione, dimensioni, rotazione e, nella sezione **Aspetto**, opacità, visibilità, fusione, dissolvenza, ombra e blocco.

### 4.5 Allineare e distribuire

Con due o più livelli selezionati, i pulsanti in cima al pannello li allineano tra loro, alla carta o all'area sicura, e li distribuiscono con spaziatura uguale. **Disponi a griglia** li mette in righe e colonne.

![Allineamento di due livelli selezionati](img/allinea.png)

### 4.6 Il retro

**Retro** nella barra dell'editor mostra i livelli del retro, che funzionano come quelli del fronte: possono essere uguali per tutte le carte o prendere valori dal foglio. Nella griglia del set, **Retro** mostra il retro di tutte le carte.

![Il retro delle carte nella griglia](img/griglia-retro.png)

## 5. Inserire e modificare le carte

### 5.1 Creare un set

Il + accanto a **Set** chiede il nome, il template e il foglio: un foglio nuovo, con le colonne che il template legge, o uno già presente nel file dei dati e non ancora collegato.

![La finestra del nuovo set](img/nuovo-set.png)

### 5.2 Tabella e griglia

La **tabella** funziona come un foglio di calcolo: doppio clic o digitazione per modificare una cella, Alt+Invio per andare a capo dentro la cella, trascinamento del numero di riga per spostare una carta. **+ Carta**, **Duplica** ed **Elimina** agiscono sulle righe selezionate (Maiuscolo o ⌘ per selezionarne più di una).

La colonna `amount` indica quante copie stampare di ogni carta; vuota vale 1.

La **griglia** mostra le carte come verranno stampate. Il cursore in alto cambia la dimensione delle miniature (anche con ⌘ e la rotella del mouse); trascinando una carta se ne cambia la posizione.

![La griglia delle carte](img/griglia.png)

In entrambe le viste, a destra, il modulo della carta selezionata ha un campo per ogni colonna. Un clic su un livello dell'anteprima porta al suo campo. PagSu e PagGiù passano alla carta precedente o successiva, anche mentre si scrive in un campo del modulo, che resta lo stesso.

### 5.3 Ordinare e filtrare

Un clic sull'intestazione di una colonna ordina le carte (crescente, poi decrescente, poi l'ordine del foglio); nella griglia la colonna si sceglie dal menu. Il campo **Filtra…** mostra solo le righe che contengono un testo, in tutte le colonne o in una sola.

Ordinamento e filtro cambiano solo la vista: il foglio e l'esportazione restano come sono. **Applica questo ordine** riordina il foglio come lo si vede; **Mostra tutto** toglie ordinamento e filtro.

![Carte ordinate per forza e filtrate](img/ordina-filtra.png)

### 5.4 Colonne delle proprietà

Oltre al valore principale, ogni proprietà di un livello può cambiare carta per carta con una colonna `livello.proprietà`: per esempio `nome.color` per il colore del titolo o `icona.tint` per la colorazione di un'icona. **+ Colonna** propone le colonne che il template legge e che mancano nel foglio, le proprietà di un livello a scelta, o una colonna libera.

![La finestra per aggiungere una colonna](img/aggiungi-colonna.png)

Nelle celle i colori si scrivono come nomi (`red`, o il nome di una variabile colore) o in esadecimale (`#A33A2A`); un contorno come `colore/spessore/tratteggio`, per esempio `red/0.3/dashed`.

### 5.5 Modificare il file in Excel

Il file dei dati è un normale foglio di calcolo e si può modificare anche con Excel, LibreOffice o Numbers, a progetto chiuso o seguito da **Ricarica**. Al salvataggio Naibi riscrive solo le colonne con un'intestazione: formattazione delle celle, altri fogli e colonne senza intestazione restano come sono. Una cella con una formula di Excel resta una formula finché il risultato non cambia.

## 6. Testo e markup

Il testo delle carte si scrive con un markup semplice, uguale nell'app e nelle celle del foglio. Non serve HTML.

### 6.1 Markdown

| Scrivi                       | Ottieni                                        |
| ---------------------------- | ---------------------------------------------- |
| `**testo**`                  | grassetto                                      |
| `*testo*`                    | corsivo                                        |
| `++testo++`                  | sottolineato                                   |
| `~~testo~~`                  | barrato                                        |
| `==testo==`                  | evidenziato                                    |
| `^testo^` / `~testo~`        | apice / pedice                                 |
| `# Titolo`, `## Sottotitolo` | paragrafo con lo stile `heading1` o `heading2` |
| `> testo`                    | paragrafo con lo stile `note`                  |
| `- voce` / `1. voce`         | elenco puntato / numerato                      |
| `---`                        | linea separatrice                              |
| `\` a fine riga              | a capo senza nuovo paragrafo                   |

Ogni a capo inizia un nuovo paragrafo, come quando si scrive in una cella di Excel con Alt+Invio.

### 6.2 Attributi

Le parentesi quadre delimitano il testo e le graffe che seguono dicono come formattarlo: `[Attenzione]{color=red weight=800}`. Gli attributi si separano con spazi.

| Attributo                             | Esempio                                    | Effetto                                        |
| ------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| `.nome`                               | `[pino]{.keyword}`                         | applica uno stile                              |
| `color=`, `highlight=`                | `{color=#A33A2A}`                          | colore del testo o dell'evidenziazione         |
| `size=`                               | `{size=14}` · `{size=+2}` · `{size=80%}`   | dimensione in pt, relativa o in percentuale    |
| `font=`, `weight=`                    | `{font=Open_Sans weight=800}`              | famiglia (con `_` al posto degli spazi) e peso |
| `stroke=`                             | `{stroke=white/8%}`                        | contorno delle lettere                         |
| `upper`, `lower`, `smallcaps`         | `[Fase]{smallcaps}`                        | maiuscole, minuscole, maiuscoletto             |
| `left`, `center`, `right`, `justify`  | `{.flavor center}` a inizio paragrafo      | allineamento del paragrafo                     |
| `border=`, `fill=`, `radius=`, `pad=` | `[Rapida]{border=red/0.3 radius=round}`    | riquadro attorno al testo                      |
| `bg=`, `bg-color=`, `bg-size=`        | `[3]{bg=circle bg-color=blue color=white}` | forma o immagine dietro il testo               |

Le forme `circle`, `square`, `rounded`, `hexagon` e `diamond` sono sempre disponibili per `bg=`.

### 6.3 Campi, variabili e icone

| Scrivi                        | Ottieni                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `{forza}`                     | il valore del campo `forza` della carta                         |
| `{spada}`                     | la variabile `spada`: un'icona, un testo, un colore o un valore |
| `{spada*3}` · `{spada*forza}` | l'icona ripetuta tre volte, o tante volte quanto vale il campo  |
| `{legno}`                     | un'immagine di `assets/` con quel nome, alta quanto la riga     |
| `{spada tint=red size=150%}`  | l'icona con attributi validi solo per questo uso                |
| `\{`, `\*`, `\[`              | il carattere letterale                                          |

### 6.4 Aiuto alla scrittura

Nei campi di testo dell'editor, del modulo della carta e nelle celle della tabella, digitando `{` compaiono i campi e le variabili, con l'anteprima dell'icona, del testo o del colore. ↑ e ↓ scelgono, Invio o Tab inseriscono, Esc chiude. Dentro le graffe compaiono allo stesso modo gli attributi, gli stili e i colori.

Il markup è colorato mentre si scrive. Gli errori, come una variabile che non esiste, sono sottolineati in rosso e compaiono sotto l'anteprima nella sezione **Problemi su questa carta**.

<table>
<tr>
<td width="50%"><img src="img/suggerimenti.png" alt="Suggerimenti mentre si scrive una variabile"></td>
<td width="50%"><img src="img/errori-markup.png" alt="Una variabile inesistente segnalata sotto la carta"></td>
</tr>
</table>

### 6.5 Formattare senza scrivere il markup

Il pulsante **Aa Formatta…** sotto un campo di testo apre l'editor visuale: si seleziona una parte del testo, si scelgono gli attributi e l'app scrive `[testo]{...}`. In fondo si vede il markup risultante. **Salva come stile…** trasforma la formattazione in uno stile del progetto; **Togli la formattazione** rimuove le parentesi. Accanto a **Sfondo** un pulsante apre le miniature: forme predefinite, variabili immagine e immagini del progetto.

![L'editor della formattazione](img/formatta.png)

## 7. Variabili e stili

### 7.1 Variabili

Le variabili si creano con il + accanto a **Variabili** e si modificano con un clic. Ce ne sono quattro tipi:

- **Icona**: un'immagine di `assets/` con tinta, dimensione rispetto alla riga, spostamento verticale, rotazione, ribaltamento e opacità. Con **Colore del testo in cui è inserita** l'icona prende il colore del testo.
- **Testo**: un testo, anche formattato, che sostituisce `{nome}`. Può richiamare altre variabili.
- **Colore**: un colore con un nome, utilizzabile in ogni proprietà colore e negli attributi del markup. Una variabile con il nome di un colore predefinito (per esempio `red`) lo ridefinisce in tutto il progetto.
- **Valore**: un testo o un numero, utilizzabile nei testi e nelle formule (per esempio il numero massimo di carte in mano).

<table>
<tr>
<td width="50%"><img src="img/variabile-icona.png" alt="Una variabile icona"></td>
<td width="50%"><img src="img/variabile-testo.png" alt="Una variabile di testo"></td>
</tr>
</table>

In cima alla finestra una frase di prova mostra il risultato. Rinominare una variabile aggiorna i richiami nei template, nelle celle, nelle altre variabili e negli stili.

### 7.2 Stili di testo

Uno stile raccoglie attributi del testo con un nome: si applica a un livello intero (proprietà **Stile**), a un paragrafo (`{.nome}` a inizio riga) o a una porzione (`[testo]{.nome}`). Modificando lo stile cambiano tutte le carte che lo usano. Uno stile può basarsi su un altro ed ereditarne gli attributi.

`heading1`, `heading2` e `note` esistono in ogni progetto e corrispondono a `#`, `##` e `>`; si possono ridefinire.

![L'editor di uno stile](img/stile.png)

## 8. Immagini, icone e font

### 8.1 Immagini del progetto

Le immagini stanno in `assets/`, anche in sottocartelle, nei formati SVG, PNG, WebP e JPG. Ovunque si indichi un'immagine basta il nome del file, senza cartella né estensione. Se due file hanno lo stesso nome (per esempio `spada.png` e `spada.svg`) l'app lo segnala e chiede di aggiungere l'estensione o la cartella.

Il pulsante con l'immagine accanto ai campi apre le miniature degli asset, con ricerca e filtro per cartella.

![La scelta di un'immagine](img/scegli-immagine.png)

Le icone a un colore (SVG nere su fondo trasparente) si ricolorano con la proprietà **Colorazione** del livello o con la tinta della variabile.

### 8.2 Importare icone

**Importa icone…**, nella scelta delle immagini e nella finestra di una variabile icona, apre tre raccolte incluse nell'app, che funzionano senza rete:

- **game-icons.net**: circa 4200 icone, con categorie tradotte e ricerca anche in italiano. Licenza CC BY 3.0: gli autori vanno citati (vedi i crediti, [capitolo 11.6](#116-crediti)).
- **Kenney: icone e motivi**: icone per giochi da tavolo e motivi ripetibili, in CC0.
- **Kenney: carte, dadi e pedine**: immagini PNG a colori, in CC0.

Si possono scegliere più icone e rinominarle prima di importarle. Le icone finiscono in `assets/icons/` e la loro provenienza in `assets/sources.json`.

![L'importazione delle icone](img/importa-icone.png)

### 8.3 Font

Il pulsante **Aa** accanto al campo del font apre la scelta dei font, con tre schede:

- **Nel progetto**: i font in `assets/fonts/` e Nunito, il font incluso nell'app.
- **Google Fonts**: il catalogo di Google Fonts, con filtro per categoria. Si scelgono gli stili e **Scarica** salva i file in `assets/fonts/`, con la licenza. Le anteprime richiedono la rete; dopo il download il font funziona anche senza.
- **Sul computer**: i font installati. **Copia nel progetto** copia i file in `assets/fonts/`, se la licenza lo permette; altrimenti il progetto si vede uguale solo dove quel font è installato.

<table>
<tr>
<td width="50%"><img src="img/font-progetto.png" alt="I font del progetto"></td>
<td width="50%"><img src="img/font-computer.png" alt="I font installati sul computer"></td>
</tr>
</table>

Un font che non si trova viene segnalato sotto la carta e al termine dell'esportazione; il testo usa intanto un font predefinito. Al posto del nome del font si può scrivere una variabile di testo, per esempio `{titoli}`: cambiando la variabile cambia il font di tutti i livelli che la usano.

## 9. Formule e campi calcolati

Un livello con **Valore sulle carte: Formula** calcola il proprio valore dagli altri campi della carta.

- **Composizione di testo**: `{nome}.png`, `Forza {forza}`.
- **Calcolo**: se la formula contiene `+ - * /` e il risultato è un numero, si calcola: `{forza}+2`.
- **Espressione**: con `=` iniziale funziona come in Excel. Testi tra virgolette, confronti `= <> < > <= >=`, `&` per unire testi, argomenti separati da `;` o `,`. Funzioni: `IF`, `AND`, `OR`, `NOT`, `MIN`, `MAX`, `ABS`, `ROUND`, `FLOOR`, `CEILING`, `UPPER`, `LOWER`, `LEN`, `CONCAT`, `ISBLANK`, `COUNTIN`.

Nell'esempio il livello `rango` mostra "Eroe" o "Gregario" secondo la forza. Sotto la formula compare il risultato per la prima carta del set.

![Una formula su un livello di testo](img/formula.png)

Il livello **Valore** (strumento #) non si disegna: contiene un valore della carta da usare nelle formule e nei testi degli altri livelli come `{nome}`. Nell'esempio, il livello `punti` delle carte mercato conta le risorse con `COUNTIN` e il livello `punti_testo` lo mostra.

![Un livello valore con una formula](img/livello-valore.png)

Un campo vale, in ordine di precedenza: il livello valore calcolato, la cella non vuota della riga, il valore scritto nel template. Gli errori delle formule compaiono sotto la carta e nel pannello delle proprietà.

## 10. Generare le carte

**Genera…**, nell'intestazione del set, crea le righe combinando insiemi di valori. Ogni insieme ha una colonna di destinazione, un elenco di valori (uno per riga o separati da virgole; `1-5` diventa 1, 2, 3, 4, 5) e quanti valori mettere su ogni carta.

- Più insiemi si combinano in tutti i modi possibili: 6 semi e i numeri 1-5 danno 30 carte.
- Con più valori per carta si sceglie se ammettere le ripetizioni e se conta l'ordine. In **Limiti per valore** si fissano minimo e massimo per ciascun valore.
- **Come icona** scrive ogni valore come `{valore}`, così il testo mostra l'icona con quel nome.
- **Filtro** tiene solo le carte per cui un'espressione è vera, per esempio `COUNTIN({costo}; "oro") <= 1`.

L'anteprima mostra quante carte nasceranno e le prime righe. **Aggiungi in fondo** accoda le carte, **Sostituisci le carte** prende il posto di quelle esistenti. **Aggiorna le carte** scrive solo le colonne generate nelle carte già presenti, una per riga, lasciando le altre colonne come sono: per esempio si generano prima 30 carte da 6 semi e i numeri 1-5, poi con **Da una cartella…** si assegnano 30 ritratti alla colonna del ritratto. Se le carte generate sono di più, quelle in più si aggiungono in fondo. ⌘Z annulla.

![Il generatore: tre risorse, due per carta, con ripetizioni](img/genera.png)

## 11. Esportare

**Esporta…** apre una finestra con tre schede: immagini, PDF e Tabletop Simulator. In ogni scheda si scelgono i set e se ripetere le carte secondo la colonna `amount`. Le carte si disegnano con lo stesso motore dell'anteprima, comprese le modifiche non ancora salvate.

### 11.1 Immagini

Formato PNG, JPG o WebP, risoluzione (150, 300, 600 DPI o personalizzata), abbondanza inclusa o no, fronte, retro o entrambi, sfondo trasparente fuori dagli angoli arrotondati. I nomi dei file seguono un modello con `%set`, `%n` (numero della carta), `%copy`, `%side` e `{campo}`; una `/` crea sottocartelle.

![Esportazione come immagini](img/esporta-immagini.png)

### 11.2 PDF di stampa

Il PDF è vettoriale, con i font incorporati. Si scelgono pagina e orientamento, margini, spaziatura e disposizione (quante carte ci stanno, o righe × colonne). Le altre opzioni:

- **Abbondanza**: con l'abbondanza le carte si toccano e i segni di taglio sono all'esterno.
- **Rotazione**: ruota le carte se altrimenti non entrano o ne entrano di più.
- **Poster**: divide su più pagine le carte più grandi della pagina, con una sovrapposizione.
- **Piegatura**: fronte e retro affiancati, da piegare.
- **Segni di taglio**: agli angoli o a linee intere, con lunghezza, spessore e colore.
- **Fronte-retro**: retri su pagine alternate, girando il foglio sul lato lungo o corto, con una correzione dello spostamento per le stampanti che non allineano i due lati.
- **Foglio di prova**: un PDF a parte con tutte le carte in piccolo.
- **Converti in CMYK**: richiede Ghostscript installato sul computer.

![Esportazione in PDF](img/esporta-pdf.png)

### 11.3 Anteprima

**Anteprima…** mostra i file che l'esportazione scriverà, senza scrivere nulla: le immagini con il nome del file, le pagine del PDF, i fogli di Tabletop Simulator. Si scorrono con ‹ › o con le frecce.

![Anteprima delle pagine del PDF](img/esporta-anteprima.png)

### 11.4 Tabletop Simulator

Crea per ogni set i fogli di carte (fino a 10 × 7, con la griglia scelta in automatico per ridurre gli spazi vuoti) e il file del mazzo da caricare in Tabletop Simulator. I file vanno nella cartella del progetto, in quella degli oggetti salvati di Tabletop Simulator o in entrambe. Nickname e descrizione delle carte possono venire da un campo.

I fogli si richiamano con indirizzi locali, quindi il mazzo funziona sul computer che l'ha esportato. Per giocare online bisogna caricare le immagini su un servizio web e cambiare gli indirizzi in Tabletop Simulator.

![Esportazione per Tabletop Simulator](img/esporta-tts.png)

### 11.5 Profili e preset

**Profilo**, in cima alla finestra, sceglie un profilo salvato nel progetto o un preset: MakePlayingCards, The Game Crafter, stampa in casa su A4 o Letter. **Salva come…** salva le opzioni attuali come profilo con un nome, da rilanciare in seguito. Prima di ordinare conviene controllare le specifiche sul sito della tipografia, che possono cambiare.

### 11.6 Crediti

**Crediti…** compone il testo da mettere nel regolamento o sulla scatola, con le icone e i font importati dall'app raggruppati per fonte, licenza e autore. Di base elenca solo ciò che le carte usano. Il testo si copia o si salva in `export/credits.txt`. Le immagini copiate a mano in `assets/` non sono elencate.

![I crediti delle icone usate](img/crediti.png)

## 12. Backup

**Backup…** apre i backup del progetto. Di base l'app crea un backup automatico all'apertura del progetto (al massimo uno all'ora) e ne tiene gli ultimi 10; quelli fatti con **Crea un backup ora** non si cancellano da soli.

I backup stanno fuori dal progetto, di base in `Documenti/Naibi/Backup`. Le immagini si salvano una sola volta per tutti i backup del progetto, quindi un backup in più occupa poco spazio. **Ripristina…** estrae il backup in una cartella nuova accanto al progetto e la apre: il progetto attuale non viene toccato.

![La finestra dei backup](img/backup.png)

## 13. Importare da Tabletop Creator

**Importa da Tabletop Creator…** converte un progetto di Tabletop Creator in un progetto Naibi nuovo: template, set, variabili e immagini. La cartella originale viene solo letta.

Si indicano la cartella del progetto Tabletop Creator (quella con il file `.tcp` e la cartella `data`), la cartella del nuovo progetto, che deve essere nuova o vuota, e facoltativamente una cartella in cui cercare le icone della libreria. Le icone di game-icons.net e Kenney si prendono dai cataloghi dell'app.

![L'importazione da Tabletop Creator](img/importa-ttc.png)

Al termine l'app elenca ciò che non ha potuto convertire, per esempio le maschere delle immagini e le immagini a 9 sezioni, e i font usati che non sono installati.

## 14. Lavorare con un agente IA

Un agente IA che esegue comandi sul computer (per esempio Claude Code, Codex o Cursor) può leggere e modificare i progetti Naibi, cercare i problemi e disegnare le carte per controllarle. Gli serve la **skill** di Naibi, un testo di istruzioni.

**Strumenti IA…**, nella schermata di ingresso e nella barra del progetto, mostra la skill con il comando `naibi` di questo computer già inserito:

1. **Copia la skill**.
2. Incollala nell'agente e chiedigli di installarla come skill (o come istruzioni del progetto, se non gestisce le skill). In alternativa **Salva come file…** la scrive in una cartella di skill; Claude Code le legge da `.claude/skills` nella cartella utente o in un progetto.
3. Chiedi all'agente quello che ti serve, indicando la cartella del progetto.

![Gli strumenti per gli agenti IA](img/strumenti-ia.png)

Se il progetto è aperto in Naibi mentre l'agente lavora, quando ha finito premi **Ricarica** senza salvare prima: altrimenti la copia dell'app sovrascrive le modifiche dell'agente.

Il comando `naibi` si può usare anche direttamente, per esempio in uno script: `info` descrive il progetto, `check` elenca i problemi delle carte, `rows` e `set-rows` leggono e scrivono le righe di un set, `render` disegna le carte in PNG, `export` esegue un profilo di esportazione. I dettagli sono in [docs/cli.md](../cli.md).

## 15. I file del progetto

```
Esempio/
  naibi.json            nome, file dei dati, set, stili, variabili, profili di esportazione
  data/carte.xlsx       un foglio per set (o .ods, o .csv per un solo set)
  templates/<nome>.json un file per template
  assets/               immagini e icone, anche in sottocartelle
  assets/fonts/         font del progetto
  assets/sources.json   provenienza e licenza di icone e font importati
  export/               file esportati, si possono rigenerare
```

Il progetto è autonomo: copiando la cartella su un altro computer si vede uguale, a parte i font installati solo sul primo. I dettagli del formato sono in [docs/formato.md](../formato.md).

## 16. Scorciatoie da tastiera

Su Windows e Linux ⌘ è Ctrl.

| Dove          | Tasti                 | Azione                                          |
| ------------- | --------------------- | ----------------------------------------------- |
| ovunque       | ⌘S                    | salva template, dati e impostazioni             |
| set           | ⌘Z, ⇧⌘Z               | annulla e ripete le modifiche ai dati           |
| tabella       | Alt+Invio             | a capo dentro una cella                         |
| testo         | `{`, poi ↑ ↓, Invio   | suggerimenti di campi e variabili               |
| editor        | ⌘Z, ⇧⌘Z (o ⌘Y)        | annulla e ripete                                |
| editor        | T, R, E               | nuovo testo, rettangolo, ellisse                |
| editor        | ⌘D                    | duplica i livelli selezionati                   |
| editor        | ⌘G, ⇧⌘G               | raggruppa e separa                              |
| editor        | ⌘A                    | seleziona tutti i livelli                       |
| editor        | Canc                  | elimina i livelli selezionati                   |
| editor        | frecce, ⇧ + frecce    | sposta di 0,5 mm o di 5 mm                      |
| editor        | Esc                   | toglie la selezione o esce dal gruppo           |
| tela          | Maiuscolo trascinando | mantiene le proporzioni o ruota a scatti di 15° |
| tela          | Alt trascinando       | sposta senza agganciarsi                        |
| tela, griglia | ⌘ + rotella           | zoom                                            |
