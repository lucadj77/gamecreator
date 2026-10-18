// Rigenera examples/demo/data/carte.xlsx
import ExcelJS from 'exceljs'

const workbook = new ExcelJS.Workbook()

const personaggi = workbook.addWorksheet('Personaggi')
personaggi.addRows([
  ['amount', 'nome', 'banda', 'forza', 'testo', 'forza_bg'],
  [
    1,
    'Cavaliere',
    '#2F5DA8',
    4,
    'Quando attacchi, pesca **una carta**.\n{.flavor} Il castello non cadrà stanotte.',
    ''
  ],
  [
    2,
    'Arciere',
    '#3C7A3E',
    2,
    'Può colpire un [nemico]{.keyword} a distanza [2]{bg=circle bg-color=#3C7A3E color=white weight=800}.',
    ''
  ],
  [
    1,
    'Strega',
    '#7A3FA0',
    3,
    'Scambia due carte sul tavolo.\n- Se una è un [Cavaliere]{.keyword}, guadagna {spada*forza}\n- Altrimenti [Rapida]{border=#7A3FA0/0.3 radius=round color=#7A3FA0} fino a fine turno.',
    ''
  ],
  // nessuna immagine Drago: l'anteprima mostra il segnaposto "missing"
  [
    1,
    'Drago',
    '#A33A2A',
    6,
    '# Immune\nNon può essere bersaglio di ==magie==.\n---\n[Fuoco]{stroke=#A33A2A/12% color=#FFD27A size=+3 weight=900}',
    '#1A1A1A'
  ]
])

const oggetti = workbook.addWorksheet('Oggetti')
oggetti.addRows([
  ['amount', 'nome', 'costo', 'icona', 'icona.tint', 'effetto'],
  [
    3,
    'Pozione',
    1,
    'pozione',
    '#3C7A3E',
    'Recupera [2]{bg=hexagon bg-color=#3C7A3E color=white weight=800} punti vita {pozione}.'
  ],
  [1, 'Spada', 3, 'spada', '', '+2 forza.'],
  [2, 'Scudo', 2, 'scudo', '#2F5DA8', 'Annulla il prossimo attacco.']
])

await workbook.xlsx.writeFile(new URL('../examples/demo/data/carte.xlsx', import.meta.url).pathname)
