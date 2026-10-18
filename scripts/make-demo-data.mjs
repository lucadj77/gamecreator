// Rigenera examples/demo/data/carte.xlsx
import ExcelJS from 'exceljs'

const workbook = new ExcelJS.Workbook()

const personaggi = workbook.addWorksheet('Personaggi')
personaggi.addRows([
  ['amount', 'nome', 'banda', 'forza', 'testo', 'forza_bg'],
  [1, 'Cavaliere', '#2F5DA8', 4, 'Quando attacchi, pesca una carta.', ''],
  [2, 'Arciere', '#3C7A3E', 2, 'Può colpire un nemico a distanza 2.', ''],
  [
    1,
    'Strega',
    '#7A3FA0',
    3,
    'Scambia due carte sul tavolo. Se una delle due è un Cavaliere, la Strega guadagna forza {forza} fino a fine turno.',
    ''
  ],
  // nessuna immagine Drago: l'anteprima mostra il segnaposto "missing"
  [1, 'Drago', '#A33A2A', 6, 'Non può essere bersaglio di magie.', '#1A1A1A']
])

const oggetti = workbook.addWorksheet('Oggetti')
oggetti.addRows([
  ['amount', 'nome', 'costo', 'icona', 'icona.tint', 'effetto'],
  [3, 'Pozione', 1, 'pozione', '#3C7A3E', 'Recupera 2 punti vita.'],
  [1, 'Spada', 3, 'spada', '', '+2 forza.'],
  [2, 'Scudo', 2, 'scudo', '#2F5DA8', 'Annulla il prossimo attacco.']
])

await workbook.xlsx.writeFile(new URL('../examples/demo/data/carte.xlsx', import.meta.url).pathname)
