# Novità

Ogni versione ha una parte in inglese e una in italiano, in quest'ordine: Naibi mostra quella
nella lingua dell'interfaccia quando segnala un aggiornamento. Le versioni con un suffisso, come
`1.2.0-beta.1`, sono beta. Come si prepara una versione è spiegato in
[docs/rilascio.md](docs/rilascio.md).

## 1.2.0-beta.21

### English

- New **Documents** section in the sidebar, for the rules, a sell sheet, an appendix: Markdown text on the left, the page preview always visible on the right, saved as you type in `docs/<name>.md`. The text uses Naibi's markup, so `{heart}` draws the icon and `[text]{.keyword}` a style, as on the cards. **Insert card** chooses a card of the game and writes `![Wizard](card:Characters/name=Wizard)`: the document draws the card from the project, so it changes when the card changes. Problems (cards or images not found) are listed under the text and by `naibi check`; `naibi docs` shows the documents to an AI agent. **Card anatomy** draws a card with labels joined by lines to its parts (layers of the template), chosen in a window or written as an ` ```anatomy ` block; it is exported like the cards. **Table** fills in a table in a grid (also pasting from a spreadsheet) and edits the table where the cursor is. **Page** sets the page size, margins, text and heading fonts, text size, line spacing, space after paragraphs, alignment and colors; the preview shows the page at its real width. The settings are written at the top of the file, between two `---` lines, so an AI agent can change them too. **Export** saves the document in `export/docs/` as PDF (desktop only), as a single HTML file with cards, images and fonts inside, or as plain Markdown with the cards as PNG files.

### Italiano

- Nuova sezione **Documenti** nella barra laterale, per il regolamento, una sell sheet, un'appendice: a sinistra il testo in Markdown, a destra l'anteprima della pagina sempre visibile, con salvataggio mentre si scrive in `docs/<nome>.md`. Il testo usa il markup di Naibi, quindi `{cuore}` disegna l'icona e `[testo]{.keyword}` uno stile, come sulle carte. **Inserisci carta** sceglie una carta del gioco e scrive `![Mago](card:Personaggi/nome=Mago)`: il documento disegna la carta dal progetto, quindi cambia quando cambia la carta. I problemi (carte o immagini che non si trovano) compaiono sotto il testo e in `naibi check`; `naibi docs` mostra i documenti a un agente IA. **Anatomia carta** disegna una carta con le etichette collegate da una linea alle sue parti (i livelli del template), scelte in una finestra o scritte come blocco ` ```anatomy `; si esporta come le carte. **Tabella** compila una tabella in una griglia (anche incollando da un foglio di calcolo) e modifica quella dove si trova il cursore. **Pagina** imposta formato, margini, carattere del testo e dei titoli, dimensione del testo, interlinea, spazio dopo i paragrafi, allineamento e colori; l'anteprima mostra la pagina alla sua larghezza vera. Le impostazioni sono scritte in testa al file, tra due righe `---`, così le può cambiare anche un agente IA. **Esporta** salva il documento in `export/docs/` in PDF (solo nell'app per computer), in un unico file HTML con carte, immagini e font dentro, oppure in Markdown semplice con le carte come file PNG.

## 1.2.0-beta.20

### English

- **Check data file…**, at the bottom of the sidebar, shows how Naibi reads each sheet of the data file: the sets that use it, the columns their templates read and the sheet lacks, and problems: a title above the headings, repeated headings, columns without a heading, merged cells, Excel errors, formulas without a saved result, empty rows between the data, and charts that a save would remove. It does not change the file. The `naibi check-data` command does the same.
- From the same window, **Import a sheet from another file…** puts the rows of a sheet of another .xlsx, .ods or .csv file in place of those of a set. It first shows the new, removed and changed rows, matched by a column with all different values such as the name, and can keep the columns the file does not have; then it makes a backup of the project. The change can be undone with ⌘Z. Not in the web version yet.
- Numbers in .xlsx files are read with the cell's number format, as Excel shows them: 0.5 formatted as a percentage arrives as `50%`, 1234.5 formatted as currency as `1 234.50 €` (always with a decimal point, and a space for thousands). Formulas in templates read these values as numbers (`{chance}*2`, `=IF({cost}>1000; …)`); typing `60%` or `3.50 €` in Naibi writes the number back to the cell, keeping its format, in .ods files too.
- Saving the data of a set in an .xlsx file now changes only the changed cells and leaves the rest of the file as it was, so charts, pivot tables and anything else Naibi does not know stay, in every sheet. Naibi still rewrites the whole file, and asks first if it would lose something, when a set is added, renamed or deleted. After a save Excel recalculates the formulas when it opens the file.

### Italiano

- **Controlla file dati…**, in fondo alla barra laterale, mostra come Naibi legge ogni foglio del file dei dati: i set che lo usano, le colonne che i loro template leggono e il foglio non ha, e le anomalie: un titolo sopra le intestazioni, intestazioni ripetute, colonne senza intestazione, celle unite, errori di Excel, formule senza risultato salvato, righe vuote tra i dati e i grafici che un salvataggio toglierebbe. Non modifica il file. Il comando `naibi check-data` fa lo stesso.
- Dalla stessa finestra, **Importa un foglio da un altro file…** mette le righe di un foglio di un altro file .xlsx, .ods o .csv al posto di quelle di un set. Prima mostra le righe nuove, tolte e cambiate, riconosciute da una colonna con valori tutti diversi come il nome, e può tenere le colonne che il file non ha; poi fa un backup del progetto. La modifica si annulla con ⌘Z. Non ancora nella versione web.
- I numeri dei file .xlsx si leggono con il formato della cella, come li mostra Excel: 0,5 in percentuale arriva come `50%`, 1234,5 in valuta come `1 234.50 €` (sempre con il punto per i decimali e lo spazio per le migliaia). Le formule dei template leggono questi valori come numeri (`{probabilità}*2`, `=IF({costo}>1000; …)`); scrivendo `60%` o `3,50 €` in Naibi nella cella torna il numero, con il suo formato, anche nei file .ods.
- Salvando i dati di un set in un file .xlsx Naibi ora cambia solo le celle modificate e lascia il resto del file com'era: grafici, tabelle pivot e tutto ciò che Naibi non conosce restano, in tutti i fogli. Il file viene ancora riscritto tutto, con una domanda prima se si perderebbe qualcosa, quando si aggiunge, rinomina o elimina un set. Dopo un salvataggio Excel ricalcola le formule quando apre il file.

## 1.2.0-beta.19

### English

- Several sets can use the same sheet, each with its own template: for example "Red troops" and "Yellow troops" drawn from one "Troops" sheet. In **New set**, under **Sheet**, the sheets already in use are listed as "Troops (data of Red troops)". A change to the data in one set applies to all the sets on the sheet; renaming one of them does not rename the sheet, and deleting one leaves the sheet in the file while another set uses it. The `naibi rename-set` command behaves the same way.
- When the data file is changed outside Naibi (Excel, LibreOffice, the `naibi` command), Naibi reads it again by itself. If Naibi has unsaved changes to the data, a notice offers **Reload** or **Ignore** instead.
- The data file can be set to **read-only**, with the checkbox at the bottom of the sidebar: Naibi then never writes to it. Changes to the data are refused, renaming a set keeps the sheet name, deleting a set leaves its sheet in the file, and `naibi set-rows` and `naibi pull-sheets` refuse too. This suits a data file that you edit in Excel, with formulas and charts that a save from Naibi would lose.

### Italiano

- Più set possono usare lo stesso foglio, ognuno col suo template: per esempio "Truppe rosse" e "Truppe gialle" dallo stesso foglio "Truppe". In **Nuovo set**, alla voce **Foglio**, i fogli già usati compaiono come "Truppe (dati di Truppe rosse)". Una modifica ai dati in un set vale per tutti i set del foglio; rinominarne uno non rinomina il foglio, ed eliminarne uno lascia il foglio nel file finché lo usa un altro set. Il comando `naibi rename-set` si comporta allo stesso modo.
- Quando il file dei dati viene modificato fuori da Naibi (Excel, LibreOffice, il comando `naibi`), Naibi lo rilegge da solo. Se in Naibi ci sono modifiche ai dati non salvate, compare invece un avviso con **Ricarica** e **Ignora**.
- Il file dei dati si può mettere **in sola lettura**, con la casella in fondo alla barra laterale: Naibi non ci scrive mai. Le modifiche ai dati vengono rifiutate, rinominare un set non rinomina il foglio, eliminare un set lascia il foglio nel file, e anche `naibi set-rows` e `naibi pull-sheets` rifiutano. È pensato per un file dei dati che modifichi in Excel, con formule e grafici che un salvataggio di Naibi perderebbe.

## 1.2.0-beta.18

### English

- Saving a set whose sheet has empty rows between the cards no longer moves the cards up: each card goes back to its row, the empty rows stay where they are, and the columns Naibi does not use (notes, formulas) stay next to the right card. The same holds for .ods files. If the headings are not in row 1 (for example row 1 is empty), Naibi now also writes them back to the right row.
- Help (F1), Formulas tab: every function has an example with its result.
- **New project** can start from a data file you already have (.xlsx, .ods, .csv): Naibi works on a copy in the project's `data` folder and its sheets become sets with **New set**. The guide has a new page on using an existing Excel file.
- If the Excel data file contains charts, pivot tables, slicers or links to other files, Naibi warns before saving set data, because saving removes them from the whole file.
- Renaming a set whose sheet is already in the data file asks whether to rename the sheet too: formulas in other sheets that refer to it would break.
- Cells with an Excel error now read as the error (`#DIV/0!`, `#N/A`) instead of `[object Object]`, and FALSE reads as `false` instead of an empty cell.
- A note that is already written opens in Preview; a new one opens ready for writing.
- The colour picker has a **None** button: it writes `none` (no colour) without typing it.

### Italiano

- Salvando un set il cui foglio ha righe vuote tra le carte, le carte non salgono più: ognuna torna nella sua riga, le righe vuote restano dove sono e le colonne che Naibi non usa (note, formule) restano accanto alla carta giusta. Vale anche per i file .ods. Se le intestazioni non sono nella riga 1 (per esempio la riga 1 è vuota), Naibi ora le riscrive anche nella riga giusta.
- Aiuto (F1), scheda Formule: ogni funzione ha un esempio con il suo risultato.
- **Nuovo progetto** può partire da un file di dati che hai già (.xlsx, .ods, .csv): Naibi lavora su una copia nella cartella `data` del progetto e i suoi fogli diventano set con **Nuovo set**. La guida ha una pagina nuova su come usare un file Excel che hai già.
- Se il file dei dati Excel contiene grafici, tabelle pivot, filtri dati o collegamenti ad altri file, Naibi avvisa prima di salvare i dati dei set, perché il salvataggio li toglie da tutto il file.
- Rinominando un set il cui foglio è già nel file dei dati, Naibi chiede se rinominare anche il foglio: le formule di altri fogli che lo citano si romperebbero.
- Le celle con un errore di Excel ora si leggono come l'errore (`#DIV/0!`, `#N/D`) invece di `[object Object]`, e FALSO si legge `false` invece di una cella vuota.
- Una nota già scritta si apre in Anteprima; una nuova si apre pronta per scrivere.
- Il selettore del colore ha il pulsante **Nessuno**: scrive `none` (nessun colore) senza doverlo digitare.

## 1.2.0-beta.17

### English

- **Statistics…** in the set header: how many cards have each value of a column (formula layers too), with sum, average, minimum and maximum of numbers, counting the copies in `amount`. With a filter, only the filtered cards count. The new `naibi stats` command gives the same numbers to an AI.
- **Check text…** in the set header lists the cards (front and back) whose text does not fit in its box, even shrunk to the minimum size; in the grid those cards have an orange mark.
- **Trash…** in the toolbar: deleted templates, sets and notes, with **Restore** to put them back in the project (a set gets the template you choose).
- **Compare…** marks the cards that are new or changed since the last export or a backup (blue dot), and the export can include only those: reprint just what changed.
- **Split image…** in the set header spreads one big image across the cards (columns × rows, by rows or by columns, with or without the outer bleed in the image): the cards make up the image again when placed in a grid.
- Tabletop Simulator: two new objects per set. **Boards**: like tiles but not stackable, each one on the table next to the others. **Dice (6 faces)**: every six cards of the set make a die (card 1 on face 1 and so on, opposite faces adding up to 7), with the value shown when you roll it.
- **Google Sheets…** in the top bar: set data from a Google sheet shared by link, one tab per set (usually with the same name). The link stays in the project to refresh the data with one click; also from the command line with `naibi pull-sheets`.
- Automatic update: **Update and restart** in the new version notice downloads it, installs it and reopens Naibi (Windows setup, Linux AppImage, Mac). It works from the version after this one; the Windows portable version and the .deb are still downloaded by hand.

### Italiano

- **Statistiche…** nell'intestazione del set: quante carte hanno ogni valore di una colonna (anche dei livelli con formula), con somma, media, minimo e massimo dei numeri, contando le copie di `amount`. Con un filtro contano solo le carte filtrate. Il nuovo comando `naibi stats` dà gli stessi numeri a un'IA.
- **Controlla testi…** nell'intestazione del set elenca le carte (fronte e retro) con un testo che non sta nel riquadro, anche ridotto alla dimensione minima; nella griglia quelle carte hanno un segno arancione.
- **Cestino…** nella barra in alto: template, set e note eliminati, con **Ripristina** per rimetterli nel progetto (un set prende il template scelto).
- **Confronta…** segna le carte nuove o cambiate dall'ultima esportazione o da un backup (punto blu), e l'esportazione può includere solo quelle: si ristampa solo ciò che è cambiato.
- **Dividi immagine…** nell'intestazione del set distribuisce un'immagine grande tra le carte (colonne × righe, per righe o per colonne, con o senza l'abbondanza esterna nell'immagine): messe in griglia, le carte ricompongono l'immagine.
- Tabletop Simulator: due nuovi oggetti per set. **Plance**: come le tessere ma non impilabili, ognuna sul tavolo accanto alle altre. **Dadi (6 facce)**: ogni sei carte del set fanno un dado (la carta 1 sulla faccia 1 e così via, facce opposte che fanno 7), con il valore mostrato quando lo tiri.
- **Google Sheets…** nella barra in alto: i dati dei set da un foglio Google condiviso con il link, una scheda per set (di solito con lo stesso nome). Il link resta nel progetto per aggiornare i dati con un clic; anche da riga di comando con `naibi pull-sheets`.
- Aggiornamento automatico: **Aggiorna e riavvia** nell'avviso di una versione nuova la scarica, la installa e riapre Naibi (setup di Windows, AppImage di Linux, Mac). Vale dalla versione successiva a questa; la versione portatile di Windows e il .deb restano da scaricare a mano.

## 1.2.0-beta.16

### English

- New box attribute `text-raise=`: moves only the text inside a box (`bg=`, `fill=`, `border=`) up by the given pt, or down with a negative value, without moving the box. It also works in a style, for example `.heart = bg=heart color=white text-raise=1`, and appears in the Format dialog under the box settings.

### Italiano

- Nuovo attributo dei riquadri `text-raise=`: sposta in su dei pt indicati, o in giù con un valore negativo, solo il testo dentro un riquadro (`bg=`, `fill=`, `border=`) senza spostare il riquadro. Vale anche in uno stile, per esempio `.cuore = bg=cuore color=white text-raise=1`, e compare nella finestra Formato tra le impostazioni del riquadro.

## 1.2.0-beta.15

### English

- Project notes: a new **Notes** section at the bottom of the sidebar. The + creates a note, a click opens it in a panel beside any screen (sets, templates). Notes are written in Markdown, with a **Preview**, are renamed from their title and save themselves as you type, as `notes/<name>.md` files in the project. Deleted notes go to the `deleted` folder.
- An AI working on the project reads the notes with the new `naibi notes` command (also listed by `naibi info`); the skill asks it to read them before working.

### Italiano

- Note del progetto: una nuova sezione **Note** in fondo alla barra laterale. Il + crea una nota, un clic la apre in un pannello accanto a qualsiasi schermata (set, template). Le note si scrivono in Markdown, con un'**Anteprima**, si rinominano dal titolo e si salvano da sole mentre si scrive, come file `notes/<nome>.md` del progetto. Le note eliminate vanno nella cartella `deleted`.
- Un'IA che lavora sul progetto legge le note con il nuovo comando `naibi notes` (le elenca anche `naibi info`); la skill le chiede di leggerle prima di lavorare.

## 1.2.0-beta.14

### English

- Set view: **Reset** in the **Columns** menu goes back to the basic view. Only the columns read by layers linked to a column stay visible, with their properties in the field details, which close. Sheet columns no layer reads, for example left over from an imported TTC project, are hidden; nothing is deleted.

### Italiano

- Vista del set: **Ripristina** nel menu **Colonne** torna alla vista di base. Restano visibili solo le colonne lette dai livelli collegati a una colonna, con le loro proprietà nei dettagli dei campi, che si chiudono. Le colonne del foglio che nessun livello legge, per esempio rimaste da un progetto TTC importato, si nascondono; non si cancella niente.

## 1.2.0-beta.13

### English

- Editor, like Affinity: holding Shift while moving a layer keeps it horizontal, vertical or at 45°. While resizing, Shift switches the proportion lock (before, it could only turn it on) and ⌘ (Ctrl on Windows) resizes from the center.
- The hexagon is now regular (all sides and angles equal): as card shape, where it is the largest that fits in the card (**Fit the card to the hexagon** adjusts the short side so it fills the card), and as text background (`bg=hexagon`). Before, it was stretched to the card size. Polygon and star layers get a **Make regular** button.
- Text: underscores keep a piece of text on one line, so a number and its icon never get separated: `_4{coin}_`. The same as the new `nowrap` attribute: `[4{coin}]{nowrap}`.
- Styles and variables can be split into groups (**Group** field in their window, or by dragging an item onto a group heading or next to an item of another group). In the sidebar each group has a heading that closes with a click; with more than 12 items a field filters them by name.
- Sidebar: the Sets, Templates, Styles and Variables headings stand out as colored bands, with larger icons and buttons.
- The style and variable windows show **Where it is used**: templates with their layers, sets with card numbers, other variables and styles. Clicking a template or set opens it.
- PDF export: new **One after another on the same page** option. A set starts right after the previous one instead of on a new page, so 10 + 8 cards with 9 per page take 2 pages, not 3. A set with cards of another size starts on a new row of the same page, if there is room.

### Italiano

- Editor, come in Affinity: tenendo premuto Maiuscolo mentre si sposta un livello, questo resta in orizzontale, in verticale o a 45°. Ridimensionando, Maiuscolo inverte il blocco delle proporzioni (prima poteva solo attivarlo) e ⌘ (Ctrl su Windows) ridimensiona dal centro.
- L'esagono ora è regolare (lati e angoli tutti uguali): come forma della carta, dove è il più grande che sta nella carta (**Adatta la carta all'esagono** cambia il lato corto perché la riempia), e come sfondo nel testo (`bg=hexagon`). Prima si allungava sulle misure della carta. I livelli poligono e stella hanno un pulsante **Rendi regolare**.
- Testo: i trattini bassi tengono un pezzo di testo sulla stessa riga, così un numero e la sua icona non si separano: `_4{moneta}_`. È lo stesso del nuovo attributo `nowrap`: `[4{moneta}]{nowrap}`.
- Stili e variabili si possono dividere in gruppi (campo **Gruppo** nella loro finestra, oppure trascinando una voce sul titolo di un gruppo o accanto a una voce di un altro gruppo). Nella barra laterale ogni gruppo ha un titolo che si chiude con un clic; con più di 12 voci un campo le filtra per nome.
- Barra laterale: i titoli Set, Template, Stili e Variabili risaltano come fasce colorate, con icone e pulsanti più grandi.
- Le finestre di stili e variabili mostrano **Dove si usa**: template con i livelli, set con i numeri delle carte, altre variabili e stili. Un clic su un template o su un set lo apre.
- Esportazione in PDF: nuova opzione **Uno dopo l'altro sulla stessa pagina**. Un set comincia subito dopo il precedente invece che su una pagina nuova, quindi 10 + 8 carte con 9 per pagina occupano 2 pagine e non 3. Un set con carte di un'altra misura comincia su una riga nuova della stessa pagina, se c'è posto.

## 1.2.0-beta.12

### English

- Tabletop Simulator export: new **Objects** option, set by set. Besides **Cards** (the deck, as before), a set can become **Tokens** or **Tiles**.
  - A token is the card cut out along its shape, with a thickness; underneath, Tabletop Simulator shows the front mirrored.
  - A tile has the card front and back, the card shape (square, rounded, hexagonal or round), a thickness and an **Edge** color.
  - Thickness is in mm. The pieces of a set go into a bag, copies included.
  - Cards, tokens and tiles keep their true proportions in Tabletop Simulator: a 63 mm card keeps the usual size, smaller or larger cards and pieces are scaled to match.

### Italiano

- Esportazione per Tabletop Simulator: nuova opzione **Oggetti**, set per set. Oltre a **Carte** (il mazzo, come prima), un set può diventare **Segnalini** o **Tessere**.
  - Un segnalino è la carta ritagliata sulla sua forma, con uno spessore; sotto, Tabletop Simulator mostra il fronte specchiato.
  - Una tessera ha fronte e retro della carta, la forma della carta (quadrata, arrotondata, esagonale o rotonda), uno spessore e un colore del **Bordo**.
  - Lo spessore è in mm. I pezzi di un set vanno in un sacchetto, copie comprese.
  - Carte, segnalini e tessere mantengono in Tabletop Simulator le proporzioni vere: una carta da 63 mm resta della misura solita, carte e pezzi più piccoli o più grandi si scalano di conseguenza.

## 1.2.0-beta.11

### English

- Web version: most of what was desktop-only now works in the browser too.
  - **Icon libraries** (game-icons.net, Kenney, Iconify) and **Google Fonts** (the Latin alphabet, accented letters included).
  - **Fonts installed on the computer**, in Chrome and Edge after you allow it.
  - **Backups**. Without a chosen folder they stay in the browser, and clearing the site data deletes them.
  - **Tabletop Creator import**.
  - **Tabletop Simulator export**. Choose the Tabletop Simulator folder, then paste its full path the first time. The browser does not give the path, and the deck needs it to find the images; the site remembers it. On macOS the browser cannot open the Saved Objects folder: docs/web.md explains how to work around it.
- New **Add images…** button in the image picker, in the desktop app and in the web version. It copies images from the computer into `assets/images` of the project. A file with the same name is not overwritten: the copy gets a number.
- The **Help** window has a link to the complete user guide at the top.
- Image picker: new **Dark background** button, to see white icons. The choice is remembered.

### Italiano

- Versione web: gran parte di ciò che c'era solo nell'app desktop ora funziona anche nel browser.
  - **Librerie di icone** (game-icons.net, Kenney, Iconify) e **Google Fonts** (alfabeto latino, lettere accentate comprese).
  - **Font installati sul computer**, in Chrome ed Edge dopo averlo consentito.
  - **Backup**. Senza una cartella scelta restano nel browser, e cancellando i dati del sito si perdono.
  - **Importazione da Tabletop Creator**.
  - **Esportazione per Tabletop Simulator**. Si sceglie la cartella di Tabletop Simulator e la prima volta si incolla il suo percorso completo. Il browser non lo fornisce, e al mazzo serve per trovare le immagini; il sito lo ricorda. Su macOS il browser non può aprire la cartella Saved Objects: docs/web.md spiega come aggirarlo.
- Nuovo pulsante **Aggiungi immagini…** nella scelta delle immagini, nell'app desktop e nella versione web. Copia immagini dal computer in `assets/images` del progetto. Un file con lo stesso nome non si sovrascrive: la copia prende un numero.
- La finestra **Aiuto** ha in cima un link alla guida completa.
- Scelta delle immagini: nuovo pulsante **Sfondo scuro**, per vedere le icone bianche. La scelta viene ricordata.

## 1.2.0-beta.10

### English

- New **web version**: Naibi in the browser, with nothing to install, at https://lucadj77.github.io/naibi/. It is meant for computers where the app cannot be installed or started, for example office PCs that block unsigned programs. It works on the project folders of your computer and the projects are the same files as in the desktop app. It needs Chrome, Edge or Opera (Brave only after turning on brave://flags/#file-system-access-api), and the browser asks for permission on the project folder each time. Editing, data, templates, image export and PDF export (through the browser print window) are there; Tabletop Simulator, icon libraries, Google Fonts, backups, Tabletop Creator import and the tools for AI agents stay in the desktop app. **What the desktop app adds**, at the bottom of the start screen, lists the differences.

### Italiano

- Nuova **versione web**: Naibi nel browser, senza installare nulla, all'indirizzo https://lucadj77.github.io/naibi/. Serve sui computer dove l'app non si può installare o avviare, per esempio i PC aziendali che bloccano i programmi non firmati. Lavora sulle cartelle dei progetti del tuo computer e i progetti sono gli stessi file dell'app desktop. Richiede Chrome, Edge o Opera (Brave solo dopo aver attivato brave://flags/#file-system-access-api), e il browser chiede ogni volta il permesso sulla cartella del progetto. Ci sono modifica, dati, template, esportazione delle immagini ed esportazione PDF (dalla finestra di stampa del browser); Tabletop Simulator, librerie di icone, Google Fonts, backup, importazione da Tabletop Creator e strumenti per gli agenti IA restano nell'app desktop. **Cosa ha in più la versione desktop**, in fondo alla schermata iniziale, elenca le differenze.

## 1.2.0-beta.9

### English

- Tabletop Simulator export: new **Copies on the sheet** option, shown when Copies is on. "Once" works as before: each card appears once on the sheet and the deck file multiplies it. "Repeated on the sheet" draws each copy in its own slot, as many times as `amount` says, so the sheets can be loaded into Tabletop Simulator by hand without the deck file. With this choice `{card.copy}` numbers the copies on the sheet too.
- `naibi` command on Windows: the installed app now has `naibi-cli.cmd` next to `naibi.exe`, and **AI tools…** gives that command. Launched directly, `naibi.exe` returned to the prompt before finishing, without its exit code, and inside the sandbox of some AI agents (Codex) it closed at once. The `.cmd` waits for the end, returns the exit code and starts without Chromium's sandbox. The installer also lets sandboxed agents (Codex) read and run Naibi's folder, read-only, so no permission needs changing by hand. Copy the skill again into your agent to update it.

### Italiano

- Esportazione per Tabletop Simulator: nuova opzione **Copie nel foglio**, visibile quando Copie è attivo. "Una volta" funziona come prima: ogni carta compare una volta nel foglio e il file del mazzo la moltiplica. "Ripetute nel foglio" disegna ogni copia in una sua posizione, quante volte dice `amount`, così i fogli si possono caricare a mano in Tabletop Simulator senza il file del mazzo. Con questa scelta anche `{card.copy}` numera le copie nel foglio.
- Comando `naibi` su Windows: l'app installata ha ora `naibi-cli.cmd` accanto a `naibi.exe`, e **Strumenti IA…** indica questo comando. Lanciato direttamente, `naibi.exe` tornava al prompt prima di finire, senza codice di uscita, e dentro la sandbox di alcuni agenti IA (Codex) si chiudeva subito. Il `.cmd` aspetta la fine, restituisce il codice di uscita e parte senza la sandbox di Chromium. L'installer inoltre permette agli agenti in sandbox (Codex) di leggere ed eseguire la cartella di Naibi, senza poterla modificare, così non serve cambiare permessi a mano. Copia di nuovo la skill nel tuo agente per aggiornarla.

## 1.2.0-beta.8

### English

- Export dialog: many warnings (for example images not found and replaced with a placeholder) no longer push the buttons off the bottom of the screen. The warnings scroll in their own box, the dialog scrolls if the screen is low, and the buttons stay visible at the bottom.

### Italiano

- Finestra Esporta: molti avvisi (per esempio immagini non trovate e sostituite con un segnaposto) non spingono più i pulsanti fuori dallo schermo. Gli avvisi scorrono in un riquadro a sé, la finestra scorre se lo schermo è basso e i pulsanti restano visibili in fondo.

## 1.2.0-beta.7

### English

- Tabletop Simulator export on Windows: the saved objects now load in TTS. The image addresses in the JSON were written as standard file URLs (`/` and `%20`), which TTS on Windows does not read; they are now written as TTS writes them itself, `file:///C:\...` with backslashes. Export again to update the files.

### Italiano

- Esportazione per Tabletop Simulator su Windows: gli oggetti salvati ora si caricano in TTS. Gli indirizzi delle immagini nel JSON erano scritti come URL di file standard (`/` e `%20`), che TTS su Windows non legge; ora sono scritti come li scrive TTS stesso, `file:///C:\...` con le barre rovesciate. Esporta di nuovo per aggiornare i file.

## 1.2.0-beta.6

### English

- Tabletop Simulator export on Windows: card images could stay "still waiting" until the export stopped, even if they show in the app. The export no longer waits for Chromium to pre-decode each image, which in the hidden export window may never answer; it waits for the image to load and then draws it.

### Italiano

- Esportazione per Tabletop Simulator su Windows: le immagini delle carte potevano restare "in attesa" fino all'arresto dell'esportazione, anche se nell'app si vedono. L'esportazione non aspetta più che Chromium decodifichi in anticipo ogni immagine, cosa che nella finestra nascosta di esportazione può non rispondere mai; aspetta che l'immagine sia caricata e poi la disegna.

## 1.2.0-beta.5

### English

- Exports to Tabletop Simulator with large sheets (many cards, big images, 4096 px or more) no longer stop with "the export page did not answer within 60 s". The 60 s limit introduced in 1.2.0-beta.4 counted the whole sheet; now an export can take as long as it needs while it keeps working, and stops only when nothing moves for 60 s.
- When an export does get stuck, the error now says what it was waiting for: the names of the images or fonts that did not load, a page that stopped drawing, or a page that closed.

### Italiano

- Le esportazioni per Tabletop Simulator con fogli grandi (molte carte, immagini pesanti, 4096 px o più) non si fermano più con "the export page did not answer within 60 s". Il limite di 60 s introdotto nella 1.2.0-beta.4 contava tutto il foglio; ora un'esportazione può durare quanto serve finché procede, e si ferma solo se per 60 s non succede niente.
- Quando un'esportazione si blocca davvero, l'errore dice cosa stava aspettando: i nomi delle immagini o dei font che non si sono caricati, una pagina che ha smesso di disegnare o una pagina che si è chiusa.

## 1.2.0-beta.4

### English

- **Rename set**, next to Duplicate set: the set's sheet in the data file takes the new name when you save, with its formatting and formulas, and the export profiles that pick the set follow the new name.
- **Rename** in the template editor: the new name also goes into the sets, the derived templates and the `template` column of the cards that use it, and the template's file is renamed when you save.
- A deleted template now always goes to the project's `deleted` folder, with date and time in its name, instead of the system trash, which some folders (synced or on network drives) do not allow. To get it back, put the file back in `templates`.
- The sheet of a deleted set now leaves the data file when you save and goes to the `deleted` folder as a file of its own, with its formatting. Its name is free again for another set.
- New `naibi rename-set` and `naibi rename-template` commands, so that an AI agent renames sets and templates the same way as the app. Copy the skill again into your agent to update it.
- **System variables** for text and formulas: `{project.name}`, `{set.name}`, `{template.name}`, `{card.number}`, `{set.rows}`, `{set.cards}`, `{card.copies}`, `{card.copy}`, `{card.side}` and `{date}`. They are suggested while you type a field name, after the project's variables. `{card.copy}` gives each copy of a card its own number in PDF and image exports.
- **Help** (button in the top bar and on the start screen, or F1): the text markup, the system variables, the formula functions and the keyboard shortcuts in one window.
- Fixes from a code review: undoing all the changes of a template now reaches the app too (before, saving wrote the modified version); deleting a derived template after renaming its base no longer moves the base's file to `deleted`; saving the data file leaves untouched cells as they are (dates, formatted text, numbers with more than 15 digits), and only numbers that read back the same are written as numbers; formula syntax errors are reported on the cards and by `naibi check`; image export names are unique across sets even without `%set`; a poster margin wider than half the page no longer freezes the app; a new set with the name of a set just deleted sends the old sheet to `deleted` instead of overwriting it.
- More fixes from the same review: an export that never answers now stops with an error after 60 s instead of hanging; `naibi set-rows`, `rename-set` and `rename-template` make their backup in the app's backup folder, with the app's settings, and refuse when the app is open on the project without `begin`; an app on another computer (project on a shared disk) is noticed only if its state file is recent; the new-template dialog checks the template names, not the file names; undo after saving a renamed set no longer recreates the old sheet; two template files with the same name inside are reported instead of both loading; a renamed template no longer overwrites an existing file with the new name; two projects with the same name get separate backup folders; `MIN()` and `MAX()` without arguments are errors instead of ±Infinity; image names reserved by Windows (CON, PRN, AUX, NUL, COM1…) get a leading underscore; TTS sets with the same name no longer overwrite each other's images; `to top left` and the other two-word gradient directions work; auto-fit of a text layer is recomputed when its italic, letter spacing, text transform, alignment or stroke change; a custom DPI in the export dialog no longer snaps back to a preset; the row selection follows the duplicated rows; the built-in text styles cannot be deleted; switching set resets the grid state; the icon library files are written safely.

### Italiano

- **Rinomina set**, accanto a Duplica set: al salvataggio il foglio del set nel file dati prende il nome nuovo, con formattazione e formule, e i profili di esportazione che scelgono il set seguono il nome nuovo.
- **Rinomina** nell'editor dei template: il nome nuovo va anche nei set, nei template derivati e nella colonna `template` delle carte che lo usano, e il file del template cambia nome al salvataggio.
- Un template eliminato ora va sempre nella cartella `deleted` del progetto, con data e ora nel nome, invece che nel cestino del sistema, che in alcune cartelle (sincronizzate o su dischi di rete) non si può usare. Per recuperarlo si rimette il file in `templates`.
- Anche il foglio di un set eliminato ora, al salvataggio, esce dal file dei dati e va nella cartella `deleted` come file a sé, con la sua formattazione. Il suo nome torna libero per un altro set.
- Nuovi comandi `naibi rename-set` e `naibi rename-template`, così un agente IA rinomina set e template come fa l'app. Copia di nuovo la skill nel tuo agente per aggiornarla.
- **Variabili di sistema** per testi e formule: `{project.name}`, `{set.name}`, `{template.name}`, `{card.number}`, `{set.rows}`, `{set.cards}`, `{card.copies}`, `{card.copy}`, `{card.side}` e `{date}`. Vengono suggerite mentre scrivi il nome di un campo, dopo le variabili del progetto. `{card.copy}` dà a ogni copia di una carta il suo numero nelle esportazioni PDF e immagini.
- **Aiuto** (pulsante nella barra in alto e nella schermata iniziale, oppure F1): i marcatori del testo, le variabili di sistema, le funzioni delle formule e le scorciatoie da tastiera in una sola finestra.
- Correzioni da una revisione del codice: annullare tutte le modifiche di un template ora arriva anche all'app (prima il salvataggio scriveva la versione modificata); eliminare un template derivato dopo aver rinominato il suo base non sposta più in `deleted` il file del base; il salvataggio del file dati lascia come sono le celle non toccate (date, testo formattato, numeri con più di 15 cifre) e scrive come numeri solo quelli che si rileggono uguali; gli errori di sintassi delle formule vengono segnalati sulle carte e da `naibi check`; i nomi delle immagini esportate sono unici tra i set anche senza `%set`; un margine del poster oltre metà pagina non blocca più l'app; un set nuovo con il nome di un set appena eliminato manda il vecchio foglio in `deleted` invece di sovrascriverlo.
- Altre correzioni dalla stessa revisione: un'esportazione che non risponde ora si ferma con un errore dopo 60 s invece di restare appesa; `naibi set-rows`, `rename-set` e `rename-template` fanno il backup nella cartella dei backup dell'app, con le sue impostazioni, e rifiutano se l'app è aperta sul progetto senza `begin`; un'app su un altro computer (progetto su un disco condiviso) viene considerata solo se il suo file di stato è recente; la finestra del nuovo template controlla i nomi dei template, non quelli dei file; annullare dopo aver salvato un set rinominato non ricrea più il vecchio foglio; due file di template con lo stesso nome dentro vengono segnalati invece di caricarsi entrambi; un template rinominato non sovrascrive più un file esistente con il nome nuovo; due progetti con lo stesso nome hanno cartelle di backup separate; `MIN()` e `MAX()` senza argomenti sono errori invece di ±Infinito; i nomi di immagine riservati da Windows (CON, PRN, AUX, NUL, COM1…) prendono un trattino basso davanti; set TTS con lo stesso nome non si sovrascrivono più le immagini; `to top left` e le altre direzioni a due parole delle sfumature funzionano; l'adattamento automatico di un testo si ricalcola quando cambiano corsivo, spaziatura, trasformazione, allineamento o contorno; un DPI personalizzato nella finestra di esportazione non torna più a un valore predefinito; la selezione segue le righe duplicate; gli stili di testo predefiniti non si possono eliminare; cambiando set la griglia riparte pulita; i file della libreria di icone vengono scritti in modo sicuro.

## 1.2.0-beta.3

### English

- Naibi and an AI agent no longer overwrite each other's work. Before changing a project, the agent asks the app with the new `naibi begin` command: if the project has unsaved changes the agent stops and asks you to save; otherwise Naibi shows that an AI is working and stays locked until the agent runs `naibi end`, then reloads the project by itself. **Unlock now** frees the app if the agent stops without unlocking it. The skill in **AI tools…** explains this to the agent: copy it again into your agent to update it.

### Italiano

- Naibi e un agente IA non si sovrascrivono più il lavoro. Prima di modificare un progetto l'agente lo chiede all'app con il nuovo comando `naibi begin`: se il progetto ha modifiche non salvate l'agente si ferma e ti chiede di salvare; altrimenti Naibi mostra che un'IA sta lavorando e resta bloccato finché l'agente non esegue `naibi end`, poi ricarica il progetto da solo. **Sblocca ora** libera l'app se l'agente si ferma senza sbloccarla. La skill in **Strumenti IA…** lo spiega all'agente: copiala di nuovo nel tuo agente per aggiornarla.

## 1.2.0-beta.2

### English

- The start screen has **What's new**, which shows the news of the version in use even without a connection, and **Check for updates**, which asks GitHub right away and says so when you already have the latest version. Clicking the version next to the name also opens what's new.
- **Iconify** tab in the icon window: searches over 200 more icon collections online (Material Design, Tabler, Phosphor, emoji and many others). Each collection shows its license with a colored dot: green free, blue the author must be credited, orange restrictive (share-alike, non-commercial or GPL), which you can also hide. Imported icons go to the project with their license, like the others, and appear in the credits. Needs the network.
- **Update catalog**: the game-icons.net catalog (in the icon window) and the Google Fonts list (in the font window) can be updated from the app, to get icons and fonts published after this version.
- New color picker everywhere a color is chosen: saturation area, hue and transparency sliders, hex code, RGB or HSL fields, eyedropper to pick a color from the screen, project colors and the last colors used.
- Set grid: drag on the empty space around the cards to select several at once (⇧ or ⌘ add to the selection), ⌘A selects all the cards shown and Esc goes back to one. A bar shows how many cards are selected. Dragging one of the selected cards moves all of them.
- Image **crop**: the **Crop…** button in the image properties opens the whole image with a rectangle to drag and resize, free or with the proportions of the layer's frame, to use only part of the picture. The file is not changed. Each card can have its own crop from the card form or with the `layer.crop` column (`x y width height` in percent of the image, for example `10 0 50 50`).
- Card form: changing a layer property for a card, for example with the arrows of a number field, no longer moves that property to the top of the list while you are editing it.
- Set grid: a card can also be dropped on the empty space between or after the cards, for example to move it to the end.
- Portable version for Windows (`Naibi-…-windows-portable.exe`): it runs without installing, also from a USB stick, and keeps its data (recent projects, preferences) in a `Naibi data` folder next to the file.

### Italiano

- Nella schermata di ingresso ci sono **Novità**, che mostra le novità della versione in uso anche senza rete, e **Controlla aggiornamenti**, che chiede subito a GitHub e dice anche quando hai già l'ultima versione. Anche un clic sulla versione accanto al nome apre le novità.
- Scheda **Iconify** nella finestra delle icone: cerca online in oltre 200 altre collezioni di icone (Material Design, Tabler, Phosphor, emoji e molte altre). Ogni collezione mostra la licenza con un pallino colorato: verde libera, blu va citato l'autore, arancione restrittiva (condivisione allo stesso modo, uso non commerciale o GPL), che si può anche nascondere. Le icone importate vanno nel progetto con la loro licenza, come le altre, e compaiono nei crediti. Serve la rete.
- **Aggiorna catalogo**: il catalogo di game-icons.net (nella finestra delle icone) e l'elenco dei font Google (nella finestra dei font) si aggiornano dall'app, per avere icone e font pubblicati dopo questa versione.
- Nuovo selettore colore dovunque si sceglie un colore: area della saturazione, cursori per tonalità e trasparenza, codice esadecimale, campi RGB o HSL, contagocce per prendere un colore dallo schermo, colori del progetto e ultimi colori usati.
- Griglia del set: trascinando sullo spazio vuoto intorno alle carte se ne selezionano più insieme (⇧ o ⌘ aggiungono alla selezione), ⌘A seleziona tutte le carte mostrate ed Esc torna a una sola. Una barra dice quante carte sono selezionate. Trascinando una delle carte selezionate si spostano tutte.
- **Ritaglio** delle immagini: il pulsante **Ritaglia…** nelle proprietà dell'immagine mostra l'immagine intera con un rettangolo da spostare e ridimensionare, libero o con le proporzioni del riquadro del livello, per usare solo una parte della figura. Il file non viene modificato. Ogni carta può avere il suo ritaglio dal modulo della carta o con la colonna `livello.crop` (`x y larghezza altezza` in percentuale dell'immagine, per esempio `10 0 50 50`).
- Modulo della carta: cambiando una proprietà di un livello per una carta, per esempio con le frecce di un campo numerico, la proprietà non salta più in cima all'elenco mentre la stai modificando.
- Griglia del set: una carta si può lasciare anche sullo spazio vuoto tra le carte o dopo l'ultima, per esempio per spostarla in fondo.
- Versione portable per Windows (`Naibi-…-windows-portable.exe`): si avvia senza installarla, anche da una chiavetta, e tiene i suoi dati (progetti recenti, preferenze) nella cartella `Naibi data` accanto al file.

## 1.2.0-beta.1

### English

- Derived templates: a template can be based on another one and change only some of its parts; everything else follows the base, even when the base changes later. In the editor, a chain marks the values that come from the base and an arrow the changed ones, which a click reverts. The ↳ button in the sidebar creates one, **Make independent** turns it into a normal template. Earlier versions of Naibi cannot read derived templates.
- The **Template** field in the card form picks the template of a single card (`template` column in the sheet).
- The table and the card form show every column you can edit, including the ones the template reads but the sheet does not have yet: typing a value creates the column. The **Columns** button hides the ones you do not need and can also show fixed and formula layers, read only.
- True/false columns, such as `crest.visible`, show a checkbox.
- In the card form, the eye next to a layer's field shows or hides that layer on the card, and the sliders icon opens the layer's properties for that card without adding fields to the form. Property names are translated, and properties with a fixed set of values (shape, alignment, blend...) are menus, numbers have number fields, colors a color picker.
- Cards can be exported as SVG, with project images and fonts inside the file and texts as editable SVG text.
- Double-clicking a layer in the card preview edits it right on the card: text in a box over the layer, images from the thumbnails, shapes with a color picker. A single click still goes to the field. Alt+click on the preview moves to the field of the layer underneath; in the editor Alt+click selects the layer underneath. Thin lines and the children of arranged or repeated groups are easier to click.
- The ⤢ button enlarges the card preview in a window, with the card form next to it and the same clicks and on-card editing. Double-clicking a fixed or formula layer tells where its value comes from.
- Undo and redo are always in the top bar, for sets, templates, styles and variables. Sets and templates have Duplicate, Derive and Delete buttons next to their name, and panels are wider by default.
- **Edit template** under the card preview opens the card's own template.
- Sets open in the grid view; the table is one click away.
- A click on the canvas scrollbars no longer clears the selection (Windows).
- The window title shows the installed version of Naibi.
- Beta versions are marked as such: the start screen shows the version with a "beta" label, and GitHub lists them as pre-releases.
- If you are using a beta, Naibi also tells you about newer betas; with an official version you are only told about official versions.

### Italiano

- Template derivati: un template può partire da un altro e cambiarne solo alcune parti; il resto segue il base, anche quando il base cambia dopo. Nell'editor una catena segna i valori che vengono dal base e una freccia quelli cambiati, che un clic riporta come nel base. Il pulsante ↳ nella barra laterale ne crea uno, **Rendi indipendente** lo trasforma in un template normale. Le versioni precedenti di Naibi non leggono i template derivati.
- Il campo **Template** nel modulo della carta sceglie il template di una singola carta (colonna `template` nel foglio).
- La tabella e il modulo della carta mostrano tutte le colonne modificabili, anche quelle che il template legge ma il foglio non ha ancora: scrivendo un valore la colonna si crea. Il pulsante **Colonne** nasconde quelle che non servono e può mostrare anche i livelli fissi e con formula, in sola lettura.
- Le colonne vero/falso, come `stemma.visible`, hanno una casella da spuntare.
- Nel modulo della carta l'occhio accanto al campo di un livello mostra o nasconde quel livello sulla carta, e l'icona con i cursori apre le proprietà del livello per quella carta senza aggiungere campi al modulo. I nomi delle proprietà sono tradotti, e le proprietà con valori prestabiliti (forma, allineamento, fusione...) sono menu, i numeri hanno campi numerici, i colori il selettore.
- Le carte si esportano anche in SVG, con immagini e font del progetto dentro il file e i testi come testo SVG modificabile.
- Il doppio clic su un livello nell'anteprima della carta lo modifica direttamente sulla carta: il testo in un riquadro sopra il livello, le immagini dalle miniature, le forme con il selettore del colore. Il clic singolo porta ancora al campo. Alt+clic sull'anteprima passa al campo del livello sotto; nell'editor Alt+clic seleziona il livello sotto. Le linee sottili e i figli dei gruppi disposti o ripetuti si prendono più facilmente.
- Il pulsante ⤢ ingrandisce l'anteprima della carta in una finestra, con il modulo della carta accanto e gli stessi clic e la modifica sulla carta. Il doppio clic su un livello fisso o con formula dice da dove arriva il valore.
- Annulla e ripristina sono sempre nella barra in alto, per set, template, stili e variabili. Set e template hanno i pulsanti Duplica, Deriva ed Elimina accanto al nome, e i pannelli sono più larghi di base.
- **Modifica template** sotto l'anteprima apre il template della carta.
- I set si aprono nella vista griglia; la tabella è a un clic.
- Un clic sulle barre di scorrimento della tela non toglie più la selezione (Windows).
- Il titolo della finestra mostra la versione di Naibi installata.
- Le versioni beta sono riconoscibili: la schermata di ingresso mostra la versione con l'etichetta "beta", e su GitHub compaiono come pre-release.
- Chi usa una beta riceve gli avvisi anche delle beta più recenti; chi ha una versione ufficiale riceve solo quelli delle versioni ufficiali.

## 1.1.0

### English

- At startup Naibi checks for a new version and shows it at the top, with what's new and a button to download it. You can skip a version or be reminded at the next start.

### Italiano

- Naibi controlla all'avvio se c'è una versione nuova e la segnala in alto, con le novità e il pulsante per scaricarla. Si può saltare una versione o rimandare al prossimo avvio.

## 1.0.0

### English

- First public release, with packages for Mac (Apple silicon and Intel), Windows and Linux.
- Copy and paste layers between templates, even across projects (⌘C, ⌘X, ⌘V in the editor).

### Italiano

- Prima versione pubblica, con i pacchetti per Mac (chip Apple e Intel), Windows e Linux.
- Copia e incolla dei livelli tra template, anche di progetti diversi (⌘C, ⌘X, ⌘V nell'editor).
