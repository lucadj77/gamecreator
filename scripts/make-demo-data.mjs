// Rigenera examples/demo/data/carte.xlsx
import ExcelJS from 'exceljs'

const workbook = new ExcelJS.Workbook()

const personaggi = workbook.addWorksheet('Personaggi')
personaggi.addRows([
  ['amount', 'nome', 'forza', 'testo', 'nome.color'],
  [1, 'Cavaliere', 4, 'Quando attacchi, pesca una carta.', '#1A56E8FF'],
  [2, 'Arciere', 2, 'Può colpire a distanza.', ''],
  [1, 'Strega', 3, 'Scambia due carte sul tavolo.', '#A706CCFF']
])

const oggetti = workbook.addWorksheet('Oggetti')
oggetti.addRows([
  ['amount', 'nome', 'costo', 'effetto'],
  [3, 'Pozione', 1, 'Recupera 2 punti vita.'],
  [1, 'Spada', 3, '+2 forza.']
])

await workbook.xlsx.writeFile(new URL('../examples/demo/data/carte.xlsx', import.meta.url).pathname)
