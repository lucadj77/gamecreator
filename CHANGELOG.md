# Novità

Ogni versione ha una parte in inglese e una in italiano, in quest'ordine: Naibi mostra quella
nella lingua dell'interfaccia quando segnala un aggiornamento. Le versioni con un suffisso, come
`1.2.0-beta.1`, sono beta. Come si prepara una versione è spiegato in
[docs/rilascio.md](docs/rilascio.md).

## 1.2.0-beta.4

### English

- **Rename set**, next to Duplicate set: the set's sheet in the data file takes the new name when you save, with its formatting and formulas, and the export profiles that pick the set follow the new name.
- **Rename** in the template editor: the new name also goes into the sets, the derived templates and the `template` column of the cards that use it, and the template's file is renamed when you save.
- A deleted template now always goes to the project's `deleted` folder, with date and time in its name, instead of the system trash, which some folders (synced or on network drives) do not allow. To get it back, put the file back in `templates`.

### Italiano

- **Rinomina set**, accanto a Duplica set: al salvataggio il foglio del set nel file dati prende il nome nuovo, con formattazione e formule, e i profili di esportazione che scelgono il set seguono il nome nuovo.
- **Rinomina** nell'editor dei template: il nome nuovo va anche nei set, nei template derivati e nella colonna `template` delle carte che lo usano, e il file del template cambia nome al salvataggio.
- Un template eliminato ora va sempre nella cartella `deleted` del progetto, con data e ora nel nome, invece che nel cestino del sistema, che in alcune cartelle (sincronizzate o su dischi di rete) non si può usare. Per recuperarlo si rimette il file in `templates`.

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
