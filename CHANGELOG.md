# Novità

Ogni versione ha una parte in italiano e una in inglese: Naibi mostra quella nella lingua
dell'interfaccia quando segnala un aggiornamento. Come si prepara una versione è spiegato in
[docs/rilascio.md](docs/rilascio.md).

## 1.2.0

### English

- Derived templates: a template can be based on another one and change only some of its parts; everything else follows the base, even when the base changes later. In the editor, a chain marks the values that come from the base and an arrow the changed ones, which a click reverts. The ↳ button in the sidebar creates one, **Make independent** turns it into a normal template. Earlier versions of Naibi cannot read derived templates.
- A `template` column in the sheet picks the template of a single card.
- The table and the card form show every column you can edit, including the ones the template reads but the sheet does not have yet: typing a value creates the column. The **Columns** button hides the ones you do not need and can also show fixed and formula layers, read only.
- True/false columns, such as `crest.visible`, show a checkbox.
- In the card form, the eye next to a layer's field shows or hides that layer on the card, and the sliders icon opens the layer's properties for that card without adding fields to the form. Property names are translated, and properties with a fixed set of values (shape, alignment, blend...) are menus, numbers have number fields, colors a color picker.
- Cards can be exported as SVG, with project images and fonts inside the file and texts as editable SVG text.
- Double-clicking a layer in the card preview edits it right on the card: text in a box over the layer, images from the thumbnails, shapes with a color picker. A single click still goes to the field. Alt+click on the preview moves to the field of the layer underneath; in the editor Alt+click selects the layer underneath. Thin lines and the children of arranged or repeated groups are easier to click.
- The ⤢ button enlarges the card preview in a window, with the same clicks and on-card editing. Double-clicking a fixed or formula layer tells where its value comes from.
- Sets open in the grid view; the table is one click away.
- A click on the canvas scrollbars no longer clears the selection (Windows).
- The window title shows the installed version of Naibi.

### Italiano

- Template derivati: un template può partire da un altro e cambiarne solo alcune parti; il resto segue il base, anche quando il base cambia dopo. Nell'editor una catena segna i valori che vengono dal base e una freccia quelli cambiati, che un clic riporta come nel base. Il pulsante ↳ nella barra laterale ne crea uno, **Rendi indipendente** lo trasforma in un template normale. Le versioni precedenti di Naibi non leggono i template derivati.
- Una colonna `template` nel foglio sceglie il template di una singola carta.
- La tabella e il modulo della carta mostrano tutte le colonne modificabili, anche quelle che il template legge ma il foglio non ha ancora: scrivendo un valore la colonna si crea. Il pulsante **Colonne** nasconde quelle che non servono e può mostrare anche i livelli fissi e con formula, in sola lettura.
- Le colonne vero/falso, come `stemma.visible`, hanno una casella da spuntare.
- Nel modulo della carta l'occhio accanto al campo di un livello mostra o nasconde quel livello sulla carta, e l'icona con i cursori apre le proprietà del livello per quella carta senza aggiungere campi al modulo. I nomi delle proprietà sono tradotti, e le proprietà con valori prestabiliti (forma, allineamento, fusione...) sono menu, i numeri hanno campi numerici, i colori il selettore.
- Le carte si esportano anche in SVG, con immagini e font del progetto dentro il file e i testi come testo SVG modificabile.
- Il doppio clic su un livello nell'anteprima della carta lo modifica direttamente sulla carta: il testo in un riquadro sopra il livello, le immagini dalle miniature, le forme con il selettore del colore. Il clic singolo porta ancora al campo. Alt+clic sull'anteprima passa al campo del livello sotto; nell'editor Alt+clic seleziona il livello sotto. Le linee sottili e i figli dei gruppi disposti o ripetuti si prendono più facilmente.
- Il pulsante ⤢ ingrandisce l'anteprima della carta in una finestra, con gli stessi clic e la modifica sulla carta. Il doppio clic su un livello fisso o con formula dice da dove arriva il valore.
- I set si aprono nella vista griglia; la tabella è a un clic.
- Un clic sulle barre di scorrimento della tela non toglie più la selezione (Windows).
- Il titolo della finestra mostra la versione di Naibi installata.

## 1.1.0

### Italiano

- Naibi controlla all'avvio se c'è una versione nuova e la segnala in alto, con le novità e il pulsante per scaricarla. Si può saltare una versione o rimandare al prossimo avvio.

### English

- At startup Naibi checks for a new version and shows it at the top, with what's new and a button to download it. You can skip a version or be reminded at the next start.

## 1.0.0

### Italiano

- Prima versione pubblica, con i pacchetti per Mac (chip Apple e Intel), Windows e Linux.
- Copia e incolla dei livelli tra template, anche di progetti diversi (⌘C, ⌘X, ⌘V nell'editor).

### English

- First public release, with packages for Mac (Apple silicon and Intel), Windows and Linux.
- Copy and paste layers between templates, even across projects (⌘C, ⌘X, ⌘V in the editor).
