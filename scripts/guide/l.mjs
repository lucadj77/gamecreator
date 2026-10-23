// gruppo L: livello griglia (esagoni a incastro) e contenuto delle caselle (tracciato del punteggio)
import { launch, makeProject, mockOpen, shot } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const lang = process.argv[2]
const it = lang === 'it'
const { app, win, T } = await launch({ lang, open: false })
const project = makeProject(lang)

// due template in più nel progetto di esempio: una plancia esagonale e un tracciato del punteggio
const board = {
  name: it ? 'plancia' : 'board',
  width: 120,
  height: 120,
  bleed: 3,
  safeMargin: 3,
  cornerRadius: 3,
  front: [
    {
      type: 'shape',
      name: it ? 'sfondo' : 'background',
      shape: 'rect',
      x: -3,
      y: -3,
      w: 126,
      h: 126,
      fill: '#E9E3D5',
      stroke: null,
      locked: true
    },
    {
      type: 'grid',
      name: it ? 'mappa' : 'map',
      x: 8,
      y: 8,
      w: 104,
      h: 104,
      cell: 'hex',
      rows: 7,
      columns: 7,
      interlock: true,
      orientation: 'pointy',
      gap: 1,
      padding: 2,
      zoom: 1,
      fill: '#CFE3B4',
      stroke: { color: '#5E6B47', width: 0.3 },
      background: '#F6F2E8',
      border: { color: '#8C8270', width: 0.5 },
      backgroundRadius: 3,
      radius: 0,
      cellRatio: 1,
      alignX: 'center',
      alignY: 'center',
      clip: false,
      content: ''
    }
  ],
  back: []
}
const trackName = it ? 'tracciato' : 'track'
const numName = it ? 'numero' : 'number'
const track = {
  name: trackName,
  width: 120,
  height: 70,
  bleed: 3,
  safeMargin: 3,
  cornerRadius: 3,
  front: [
    {
      type: 'shape',
      name: it ? 'sfondo' : 'background',
      shape: 'rect',
      x: -3,
      y: -3,
      w: 126,
      h: 76,
      fill: '#F6F2E8',
      stroke: null,
      locked: true
    },
    {
      type: 'text',
      name: it ? 'titolo' : 'title',
      x: 6,
      y: 4,
      w: 108,
      h: 8,
      text: it ? 'Tracciato del punteggio' : 'Score track',
      weight: 800,
      size: 11,
      color: '#2A241C'
    },
    {
      type: 'grid',
      name: it ? 'caselle' : 'cells',
      x: 6,
      y: 14,
      w: 108,
      h: 52,
      cell: 'square',
      rows: 4,
      columns: 10,
      interlock: false,
      orientation: 'pointy',
      gap: 1,
      padding: 1.5,
      zoom: 1,
      fill: '#FFFFFF',
      stroke: { color: '#8C8270', width: 0.3 },
      background: '#D9D2C2',
      border: null,
      backgroundRadius: 2,
      radius: 1,
      cellRatio: 1,
      alignX: 'center',
      alignY: 'center',
      clip: false,
      content: it ? 'casella' : 'cell'
    },
    {
      type: 'group',
      name: it ? 'casella' : 'cell',
      x: 7.5,
      y: 15.5,
      w: 9.6,
      h: 9.6,
      layout: 'none',
      gap: 0,
      columns: 1,
      justify: 'center',
      alignItems: 'center',
      repeat: '',
      clip: false,
      children: [
        {
          type: 'text',
          name: numName,
          x: 0,
          y: 0,
          w: 9.6,
          h: 9.6,
          text: '1',
          weight: 700,
          size: 9,
          color: '#2A241C',
          align: 'center',
          valign: 'middle',
          source: {
            kind: 'formula',
            expr: '=IF(MOD({cell.index}; 10) = 0; "[" & {cell.index} & "]{color=#A33A2A weight=800}"; {cell.index})'
          }
        }
      ]
    }
  ],
  back: []
}
writeFileSync(`${project}/templates/${board.name}.json`, JSON.stringify(board, null, 2))
writeFileSync(`${project}/templates/${track.name}.json`, JSON.stringify(track, null, 2))
await mockOpen(app, project)
await win.getByText(T['start.openProject']).click()
await win.waitForTimeout(2500)

// plancia: il livello griglia selezionato, con le sue proprietà
await win.locator('.sidebar').getByText(board.name, { exact: true }).first().click()
await win.waitForTimeout(1500)
await win
  .locator('aside.layers')
  .getByText(it ? 'mappa' : 'map', { exact: true })
  .first()
  .click()
await win.waitForTimeout(800)
await shot(win, `${lang}/griglia-livello`)

// tracciato: la griglia con il contenuto delle caselle
await win.locator('.sidebar').getByText(trackName, { exact: true }).first().click()
await win.waitForTimeout(1500)
await win
  .locator('aside.layers')
  .getByText(it ? 'caselle' : 'cells', { exact: true })
  .first()
  .click()
await win.waitForTimeout(800)
await shot(win, `${lang}/griglia-caselle`)
await app.close()
