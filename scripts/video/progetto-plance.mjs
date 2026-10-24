// Aggiunge al progetto di esempio i componenti del video 7 (plance, tessere, segnalini e dadi): i terreni
// esagonali (ancora rettangolari: la forma si cambia nel video), un segnalino difesa da ritagliare con la
// sagoma dello scudo, la plancia con la mappa a esagoni e il gruppo del tracciato del punteggio (la
// griglia del tracciato si aggiunge nel video) e il dado delle risorse.
// Uso da un altro script: await extend(cartella del progetto, 'it' | 'en')
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { gridGeometry } from '../../src/shared/model/grid.ts'
const REPO = new URL('../..', import.meta.url).pathname
const ExcelJS = createRequire(join(REPO, 'package.json'))('exceljs')

const box = (x, y, w, h) => ({ x, y, w, h })
const background = (name, w, h, fill, expr, locked = true) => ({
  type: 'shape',
  name,
  shape: 'rect',
  ...box(-3, -3, w + 6, h + 6),
  fill,
  stroke: null,
  ...(expr ? { source: { kind: 'formula', expr } } : {}),
  locked
})
const formula = (expr) => ({ source: { kind: 'formula', expr } })

/** la mappa della plancia: anche lo script del video la usa per sapere dove stanno le caselle */
export const MAP = {
  ...box(8, 24, 170, 158),
  cell: 'hex',
  rows: 7,
  columns: 9,
  interlock: true,
  orientation: 'pointy',
  gap: 1,
  padding: 2,
  zoom: 1,
  cellRatio: 1,
  alignX: 'center',
  alignY: 'center',
  radius: 0
}
/** il tracciato del punteggio, aggiunto nel video con lo strumento griglia */
export const TRACK = { ...box(188, 80, 84, 44), rows: 5, columns: 10 }

export function names(lang) {
  const it = lang === 'it'
  const L = (a, b) => (it ? a : b)
  return {
    lands: L('Terreni', 'Lands'),
    defense: L('Difesa', 'Defense'),
    boardSet: L('Plancia', 'Board'),
    dice: L('Dado', 'Die'),
    land: L('terreno', 'land'),
    port: L('porto', 'port'),
    token: L('difesa', 'defense'),
    board: L('plancia', 'board'),
    die: L('dado', 'die'),
    type: L('tipo', 'type'),
    icon: L('icona', 'icon'),
    value: L('valore', 'value'),
    face: L('faccia', 'face'),
    background: L('sfondo', 'background'),
    map: L('mappa', 'map'),
    hex: L('esagono', 'hexagon'),
    cell: L('casella', 'cell'),
    terrain: L('terreno_casella', 'terrain_cell'),
    visible: L('visibile', 'visible'),
    number: L('numero', 'number'),
    cellBg: L('fondo', 'fill'),
    title: L('titolo', 'title'),
    shield: L('sagoma-scudo', 'shield-outline'),
    wood: L('legno', 'wood'),
    stone: L('pietra', 'stone'),
    wheat: L('grano', 'wheat'),
    coin: L('moneta', 'coin'),
    sword: L('spada', 'sword'),
    forest: L('bosco', 'forest'),
    quarry: L('cava', 'quarry'),
    field: L('campo', 'field')
  }
}

/**
 * final: i componenti come sono alla fine del video 7 (tessere esagonali con l'icona grande,
 * segnalini rotondi, il tracciato del punteggio con il fondo colorato), per il video sulla stampa
 */
export async function extend(dest, lang, { final = false } = {}) {
  const it = lang === 'it'
  const N = names(lang)
  const g = gridGeometry({ ...MAP })
  const first = g.centers[0]
  // esagono con la punta in alto: un poligono a 6 lati largo e alto quanto la casella è alta
  const s =
    Math.round((g.centers[1].x - g.centers[0].x - MAP.gap) * (2 / Math.sqrt(3)) * 1000) / 1000
  const at = (w, h) => box(MAP.x + first.x - w / 2, MAP.y + first.y - h / 2, w, h)
  const templates = [
    {
      name: N.land,
      width: 46,
      height: 40,
      bleed: 2,
      safeMargin: 3,
      front: [
        {
          type: 'image',
          name: N.icon,
          ...box(13, 10, 20, 20),
          src: N.wood,
          fit: 'contain',
          tint: '#FFFFFF'
        },
        background(
          N.background,
          46,
          40,
          '#5E7D3A',
          `=IF({${N.type}}="${N.forest}"; "#5E7D3A"; IF({${N.type}}="${N.quarry}"; "#7A756D"; "#C49A1E"))`,
          false
        )
      ],
      back: []
    },
    {
      name: N.token,
      width: 25,
      height: 25,
      bleed: 2,
      safeMargin: 2,
      front: [
        {
          type: 'text',
          name: N.value,
          ...box(5, 6, 15, 12),
          text: '1',
          weight: 900,
          size: 20,
          color: '#FFFFFF',
          align: 'center',
          valign: 'middle'
        },
        background(N.background, 25, 25, '#2F5DA8')
      ],
      back: []
    },
    {
      name: N.board,
      width: 280,
      height: 190,
      bleed: 3,
      safeMargin: 5,
      cornerRadius: 3,
      front: [
        {
          type: 'text',
          name: N.title,
          ...box(8, 6, 264, 14),
          text: L(it, 'Il regno', 'The kingdom'),
          weight: 800,
          size: 30,
          color: '#2A241C',
          align: 'center',
          valign: 'middle',
          transform: 'upper',
          letterSpacing: 120
        },
        {
          type: 'group',
          name: N.cell,
          layout: 'none',
          gap: 0,
          columns: 1,
          justify: 'center',
          alignItems: 'center',
          clip: false,
          children: [
            {
              type: 'text',
              name: N.number,
              ...box(222, 120, 7.5, 7.5),
              text: '1',
              weight: 700,
              size: 9,
              color: '#2A241C',
              align: 'center',
              valign: 'middle',
              ...formula(
                '=IF(MOD({cell.index}; 10) = 0; "[" & {cell.index} & "]{color=#A33A2A weight=900}"; {cell.index})'
              )
            },
            {
              type: 'shape',
              name: N.cellBg,
              shape: 'rect',
              ...box(222, 120, 7.5, 7.5),
              radius: 0,
              fill: '#FFFFFF',
              stroke: { color: '#333333', width: 0.3 }
            }
          ]
        },
        {
          type: 'grid',
          name: N.map,
          ...MAP,
          fill: null,
          stroke: null,
          background: null,
          border: null,
          backgroundRadius: 3,
          clip: false,
          content: N.terrain
        },
        {
          type: 'group',
          name: N.terrain,
          layout: 'none',
          gap: 0,
          columns: 1,
          justify: 'center',
          alignItems: 'center',
          clip: false,
          children: [
            {
              type: 'group',
              name: N.visible,
              layout: 'none',
              gap: 0,
              columns: 1,
              justify: 'center',
              alignItems: 'center',
              clip: false,
              // le quattro caselle d'angolo restano vuote: una plancia che non è un rettangolo
              ...formula(
                `=NOT(OR(AND({cell.row} = 1; {cell.column} = 1); AND({cell.row} = 1; {cell.column} = ${MAP.columns}); AND({cell.row} = ${MAP.rows}; {cell.column} = 1); AND({cell.row} = ${MAP.rows}; {cell.column} = ${MAP.columns})))`
              ),
              children: [
                {
                  type: 'image',
                  name: N.icon,
                  ...at(s * 0.45, s * 0.45),
                  src: '',
                  fit: 'contain',
                  tint: '#FFFFFF',
                  opacity: 0.9,
                  ...formula(
                    `=PICK(MOD({cell.random}; 4) + 1; "${N.wood}"; "${N.stone}"; "${N.wheat}"; "")`
                  )
                },
                {
                  type: 'shape',
                  name: N.hex,
                  shape: 'polygon',
                  sides: 6,
                  ...at(s, s),
                  fill: '#5E7D3A',
                  stroke: { color: '#FFFFFF', width: 0.6 },
                  ...formula(
                    '=PICK(MOD({cell.random}; 4) + 1; "#5E7D3A"; "#7A756D"; "#C49A1E"; "#5B8DB8")'
                  )
                }
              ]
            }
          ]
        },
        background(N.background, 280, 190, '#EDE4D3')
      ],
      back: []
    },
    {
      name: N.die,
      width: 18,
      height: 18,
      bleed: 1,
      safeMargin: 1,
      cornerRadius: 2,
      front: [
        {
          type: 'image',
          name: N.icon,
          ...box(3, 3, 12, 12),
          src: N.wood,
          fit: 'contain',
          tint: '#2A241C'
        },
        background(N.background, 18, 18, '#F4EFE4')
      ],
      back: []
    }
  ]
  // la sagoma del segnalino: il solo contorno esterno dello scudo di game-icons.net (CC BY 3.0)
  mkdirSync(join(dest, 'assets', 'images'), { recursive: true })
  writeFileSync(
    join(dest, 'assets', 'images', N.shield + '.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 20c-64 96-128 88-192 104 0 256 64 320 192 368 128-48 192-112 192-368-64-16-128-8-192-104z"/></svg>\n'
  )
  if (final) {
    const [land, token, board] = templates
    Object.assign(land, { shape: 'hexagon', height: 39.8 })
    Object.assign(land.front[0], box(10, 6, 26, 26))
    token.shape = 'ellipse'
    const cell = board.front.find((l) => l.name === N.cell)
    // dove «Porta nella prima casella» mette il gruppo: la prima casella del tracciato
    for (const l of cell.children) Object.assign(l, { x: TRACK.x, y: TRACK.y + 1.25 })
    Object.assign(
      cell.children.find((l) => l.name === N.cellBg),
      formula('=IF(MOD({cell.index}; 10) = 0; "#F2C9BC"; "#FFFFFF")')
    )
    board.front.splice(1, 0, {
      type: 'grid',
      name: it ? 'tracciato' : 'track',
      ...TRACK,
      cell: 'square',
      content: N.cell
    })
  }
  for (const t of templates)
    writeFileSync(join(dest, 'templates', t.name + '.json'), JSON.stringify(t, null, 2) + '\n')

  const sheets = [
    [
      N.lands,
      N.land,
      ['amount', N.type, N.icon],
      [
        [4, N.forest, N.wood],
        [3, N.quarry, N.stone],
        [4, N.field, N.wheat]
      ]
    ],
    [
      N.defense,
      N.token,
      ['amount', N.value],
      [
        [6, 1],
        [4, 2],
        [2, 3]
      ]
    ],
    [N.boardSet, N.board, ['amount', N.title], [[1, L(it, 'Il regno', 'The kingdom')]]],
    [
      N.dice,
      N.die,
      ['amount', N.face, N.icon],
      [
        [2, 1, N.wood],
        [2, 2, N.wood],
        [2, 3, N.stone],
        [2, 4, N.stone],
        [2, 5, N.wheat],
        [2, 6, N.sword]
      ]
    ]
  ]
  const project = JSON.parse(readFileSync(join(dest, 'stella.json'), 'utf8'))
  const wb = new ExcelJS.Workbook()
  const file = join(dest, project.dataFile)
  await wb.xlsx.readFile(file)
  for (const [name, template, header, rows] of sheets) {
    const ws = wb.addWorksheet(name)
    ws.addRow(header)
    for (const row of rows) ws.addRow(row)
    project.sets.push({ name, template })
  }
  await wb.xlsx.writeFile(file)
  writeFileSync(join(dest, 'stella.json'), JSON.stringify(project, null, 2) + '\n')
  return N
}

function L(it, a, b) {
  return it ? a : b
}
