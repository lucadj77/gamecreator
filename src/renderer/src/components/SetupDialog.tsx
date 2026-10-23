import { useRef, useState } from 'react'
import { useUndo } from './useUndo'
import type { LoadedSet } from '../../../shared/project'
import type { Template } from '../../../shared/model/template'
import {
  SETUP_IMAGE_W,
  SETUP_TEXT_W,
  setupSource,
  type Setup,
  type SetupItem,
  type SetupKind
} from '../../../shared/model/setup'
import { Dialog } from '../editor/dialogs'
import { useI18n } from '../i18n/context'
import SetupDiagram from '../render/SetupDiagram'
import { itemBox, setupView, setupWithText, type Box } from '../render/setupGeometry'
import AssetPicker from './AssetPicker'
import InsertCardDialog from './InsertCardDialog'
import FormattedField from './TextFormatBar'

// Editor dello schema della preparazione del tavolo (```setup, model/setup.ts): si aggiungono
// zone, carte, mazzi, testi, frecce e immagini e si spostano con il mouse sul disegno, che è lo
// stesso del documento. Al salvataggio scrive il blocco nel testo.

/** Spazio del disegno nella finestra, in pixel */
const CANVAS_W = 720
const CANVAS_H = 440
const BLUE = '#0a84ff'

type Item = SetupItem
const KINDS = {
  zone: 'documents.setupZone',
  card: 'documents.setupCard',
  deck: 'documents.setupDeck',
  text: 'documents.setupTextItem',
  arrow: 'documents.setupArrow',
  image: 'documents.setupImage'
} as const
type Drag = { index: number; handle: string | null; x: number; y: number; orig: Item }

const snap = (n: number): number => Math.round(n)
/** L'area con un margine attorno, per poter portare gli elementi anche fuori */
const grow = (b: Box, m: number): Box => ({
  x: b.x - m,
  y: b.y - m,
  w: b.w + 2 * m,
  h: b.h + 2 * m
})

export default function SetupDialog({
  initial,
  sets,
  templates,
  project,
  maxWidth,
  font,
  display,
  onSave,
  onClose
}: {
  /** Lo schema da modificare; senza, uno nuovo */
  initial?: Setup
  sets: LoadedSet[]
  templates: Template[]
  project: string
  /** Larghezza del testo della pagina e corpo delle didascalie, in mm, come nel documento */
  maxWidth: number
  font: number
  /** Il testo come si vede nel documento, con le variabili risolte */
  display(text: string): string
  /** Il blocco ```setup */
  onSave(text: string): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [items, setItems] = useState<Item[]>(initial?.items ?? [])
  const [size, setSize] = useState(initial?.size ?? null)
  const [selected, setSelected] = useState<number | null>(null)
  /** Scelta della carta: per un elemento nuovo o per quello con questo indice */
  const [pickingCard, setPickingCard] = useState<{ kind: 'card' | 'deck'; index?: number } | null>(
    null
  )
  const [pickingImage, setPickingImage] = useState<{ index?: number } | null>(null)
  /** Area ferma mentre si trascina: senza misura scritta crescerebbe sotto il mouse */
  const [frozen, setFrozen] = useState<Box | null>(null)
  const drag = useRef<Drag | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  useUndo(
    [items, size],
    ([i, s]) => {
      setItems(i)
      setSize(s)
    },
    !pickingCard && !pickingImage
  )

  const setup: Setup = { size, items, bad: [] }
  const view = setupView(setup, sets, templates, maxWidth, font)
  const area = frozen ?? grow(view.area, size ? 10 : 25)
  const scale = Math.min(CANVAS_W / area.w, CANVAS_H / area.h)
  const sel = selected !== null && selected < items.length ? items[selected] : null

  const center = (): { x: number; y: number } => ({
    x: snap(view.area.x + view.area.w / 2),
    y: snap(view.area.y + view.area.h / 2)
  })
  const add = (it: Item): void => {
    setItems([...items, it])
    setSelected(items.length)
  }
  const change = (patch: Partial<Item>, index = selected): void => {
    if (index === null) return
    setItems(items.map((it, k) => (k === index ? ({ ...it, ...patch } as Item) : it)))
  }
  /**
   * Ruota l'elemento attorno al suo centro: il riquadro dritto che lo contiene cambia misura, e
   * x e y (il suo angolo) si spostano perché il centro resti fermo
   */
  const rotateTo = (deg: number, index = selected, from: Item | null = null): void => {
    if (index === null) return
    const o = from ?? items[index]
    if (o.kind !== 'card' && o.kind !== 'deck' && o.kind !== 'image') return
    const rotate = ((Math.round(deg) % 360) + 360) % 360
    if (o.kind === 'image') return change({ rotate }, index)
    const before = itemBox(o, sets, templates)
    const after = itemBox({ ...o, rotate }, sets, templates)
    const tenth = (n: number): number => Math.round(n * 10) / 10
    change(
      {
        rotate,
        x: tenth(before.x + (before.w - after.w) / 2),
        y: tenth(before.y + (before.h - after.h) / 2)
      },
      index
    )
  }
  const remove = (): void => {
    if (selected === null) return
    setItems(items.filter((_, k) => k !== selected))
    setSelected(null)
  }
  const duplicate = (): void => {
    if (!sel) return
    const copy = { ...sel, x: sel.x + 5, y: sel.y + 5 } as Item
    if (copy.kind === 'arrow') Object.assign(copy, { x2: copy.x2 + 5, y2: copy.y2 + 5 })
    add(copy)
  }

  const addKind = (kind: SetupKind): void => {
    const c = center()
    const at = { from: 0, to: 0 }
    switch (kind) {
      case 'card':
      case 'deck':
        setPickingCard({ kind })
        return
      case 'image':
        setPickingImage({})
        return
      case 'zone':
        add({ kind, x: c.x - 40, y: c.y - 25, w: 80, h: 50, label: '', ...at })
        return
      case 'text':
        add({
          kind,
          x: c.x - SETUP_TEXT_W / 2,
          y: c.y,
          w: SETUP_TEXT_W,
          text: t('documents.setupNewText'),
          ...at
        })
        return
      case 'arrow':
        add({ kind, x: c.x - 15, y: c.y, x2: c.x + 15, y2: c.y, label: '', ...at })
        return
    }
  }

  /** Punto del disegno in mm sotto il mouse */
  const point = (e: React.PointerEvent): { x: number; y: number } | null => {
    const m = svg.current?.getScreenCTM()
    if (!m) return null
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    const target = e.target as Element
    const p = point(e)
    if (!p || e.button !== 0) return
    const handle = target.closest('[data-handle]')?.getAttribute('data-handle') ?? null
    const hit = target.closest('[data-item]')?.getAttribute('data-item')
    const index = handle !== null ? selected : hit != null ? Number(hit) : null
    setSelected(index)
    if (index === null) return
    drag.current = { index, handle, ...p, orig: items[index] }
    setFrozen(area)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.focus()
  }
  const onPointerMove = (e: React.PointerEvent): void => {
    const d = drag.current
    const p = d && point(e)
    if (!d || !p) return
    const dx = p.x - d.x
    const dy = p.y - d.y
    const o = d.orig
    if (d.handle === 'rotate') {
      const b = itemBox(o, sets, templates)
      const deg = (Math.atan2(p.y - (b.y + b.h / 2), p.x - (b.x + b.w / 2)) * 180) / Math.PI + 90
      // con Maiuscolo a scatti di 15°, come nell'editor
      rotateTo(e.shiftKey ? Math.round(deg / 15) * 15 : deg, d.index, o)
      return
    }
    let patch: Partial<Item>
    if (d.handle === 'start') patch = { x: snap(o.x + dx), y: snap(o.y + dy) }
    else if (d.handle === 'end' && o.kind === 'arrow')
      patch = { x2: snap(o.x2 + dx), y2: snap(o.y2 + dy) }
    else if (d.handle === 'size' && o.kind === 'zone')
      patch = { w: Math.max(5, snap(o.w + dx)), h: Math.max(5, snap(o.h + dy)) }
    else if (d.handle === 'size' && (o.kind === 'image' || o.kind === 'text'))
      patch = { w: Math.max(o.kind === 'text' ? 10 : 3, snap(o.w + dx)) }
    else {
      patch = { x: snap(o.x + dx), y: snap(o.y + dy) }
      if (o.kind === 'arrow') Object.assign(patch, { x2: snap(o.x2 + dx), y2: snap(o.y2 + dy) })
    }
    change(patch, d.index)
  }
  const onPointerUp = (): void => {
    drag.current = null
    setFrozen(null)
  }
  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.target !== e.currentTarget || !sel) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      remove()
      return
    }
    const step = e.shiftKey ? 5 : 1
    const move: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step]
    }
    const m = move[e.key]
    if (!m) return
    e.preventDefault()
    const patch: Partial<Item> = { x: sel.x + m[0], y: sel.y + m[1] }
    if (sel.kind === 'arrow') Object.assign(patch, { x2: sel.x2 + m[0], y2: sel.y2 + m[1] })
    change(patch)
  }

  // contorno e maniglie dell'elemento scelto, nelle misure del disegno
  const handle = (name: string, x: number, y: number): React.JSX.Element => {
    const s = 9 / scale
    return (
      <rect
        key={name}
        data-handle={name}
        x={x - s / 2}
        y={y - s / 2}
        width={s}
        height={s}
        fill="#fff"
        stroke={BLUE}
        strokeWidth={1.5 / scale}
        style={{ cursor: name === 'size' ? 'nwse-resize' : 'move' }}
      />
    )
  }
  /** Maniglia tonda sopra il riquadro, per ruotare carte, mazzi e immagini */
  const rotateHandle = (b: Box): React.JSX.Element => {
    const r = 5 / scale
    const cx = b.x + b.w / 2
    // sopra il riquadro; sotto, se sopra uscirebbe dal disegno
    const above = b.y - 1 - 18 / scale - r > area.y
    const top = above ? b.y - 1 : b.y + b.h + 1
    const cy = above ? top - 18 / scale : top + 18 / scale
    return (
      <g key="rotate">
        <line
          x1={cx}
          y1={top}
          x2={cx}
          y2={above ? cy + r : cy - r}
          stroke={BLUE}
          strokeWidth={1.5 / scale}
          pointerEvents="none"
        />
        <circle
          data-handle="rotate"
          cx={cx}
          cy={cy}
          r={r}
          fill="#fff"
          stroke={BLUE}
          strokeWidth={1.5 / scale}
          style={{ cursor: 'grab' }}
        >
          <title>{t('documents.setupRotateHandle')}</title>
        </circle>
      </g>
    )
  }
  const box = selected !== null ? view.boxes[selected] : null
  const overlay = (
    <g>
      {!size && items.length > 0 && (
        <rect
          x={view.area.x}
          y={view.area.y}
          width={view.area.w}
          height={view.area.h}
          fill="none"
          stroke="#c8c8c2"
          strokeWidth={1 / scale}
          strokeDasharray={`${4 / scale} ${3 / scale}`}
          pointerEvents="none"
        />
      )}
      {sel && box && (
        <>
          <rect
            x={box.x - 1}
            y={box.y - 1}
            width={box.w + 2}
            height={box.h + 2}
            fill="none"
            stroke={BLUE}
            strokeWidth={1.5 / scale}
            pointerEvents="none"
          />
          {sel.kind === 'arrow'
            ? [handle('start', sel.x, sel.y), handle('end', sel.x2, sel.y2)]
            : sel.kind === 'zone' || sel.kind === 'image' || sel.kind === 'text'
              ? handle('size', box.x + box.w, box.y + box.h)
              : null}
          {(sel.kind === 'card' || sel.kind === 'deck' || sel.kind === 'image') &&
            rotateHandle(box)}
        </>
      )}
    </g>
  )

  const num = (
    label: string,
    value: number,
    onChange: (n: number) => void,
    min?: number
  ): React.JSX.Element => (
    <label>
      {label}
      <input
        className="num"
        type="number"
        min={min}
        value={Math.round(value * 10) / 10}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(n))
            onChange(min !== undefined ? Math.max(min, n) : n)
        }}
      />
    </label>
  )

  return (
    <Dialog title={t(initial ? 'documents.editSetup' : 'documents.insertSetup')} onClose={onClose}>
      <div className="dialog-form setup-dialog">
        <div className="setup-toolbar">
          <span className="muted small">{t('documents.setupAdd')}</span>
          {(Object.keys(KINDS) as SetupKind[]).map((k) => (
            <button key={k} onClick={() => addKind(k)}>
              {t(KINDS[k])}
            </button>
          ))}
        </div>
        <div className="setup-body">
          <div
            className="setup-canvas"
            tabIndex={0}
            style={{ width: CANVAS_W, height: CANVAS_H }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <SetupDiagram
              setup={setupWithText(setup, display)}
              view={{ ...view, area }}
              sets={sets}
              templates={templates}
              project={project}
              unit={1}
              maxWidth={maxWidth}
              width={area.w * scale}
              svgRef={svg}
            >
              {overlay}
            </SetupDiagram>
            {!items.length && <p className="setup-empty muted">{t('documents.setupEmpty')}</p>}
          </div>
          <div className="setup-props">
            {sel ? (
              <>
                <h3>{t(KINDS[sel.kind])}</h3>
                {(sel.kind === 'card' || sel.kind === 'deck') && (
                  <>
                    <code className="setup-ref">{sel.card}</code>
                    <button onClick={() => setPickingCard({ kind: sel.kind, index: selected! })}>
                      {t('documents.setupChangeCard')}
                    </button>
                  </>
                )}
                {sel.kind === 'image' && (
                  <>
                    <code className="setup-ref">{sel.src}</code>
                    <button onClick={() => setPickingImage({ index: selected! })}>
                      {t('documents.setupChangeImage')}
                    </button>
                  </>
                )}
                <div className="dialog-row">
                  {num('x', sel.x, (x) => change({ x }))}
                  {num('y', sel.y, (y) => change({ y }))}
                </div>
                {sel.kind === 'arrow' && (
                  <div className="dialog-row">
                    {num('x2', sel.x2, (x2) => change({ x2 }))}
                    {num('y2', sel.y2, (y2) => change({ y2 }))}
                  </div>
                )}
                {sel.kind === 'zone' && (
                  <div className="dialog-row">
                    {num(t('documents.setupW'), sel.w, (w) => change({ w }), 5)}
                    {num(t('documents.setupH'), sel.h, (h) => change({ h }), 5)}
                  </div>
                )}
                {(sel.kind === 'text' || sel.kind === 'image') &&
                  num(t('documents.setupW'), sel.w, (w) => change({ w }), 3)}
                {sel.kind === 'deck' &&
                  num(t('documents.setupCount'), sel.count, (count) => change({ count }), 1)}
                {(sel.kind === 'card' || sel.kind === 'deck' || sel.kind === 'image') && (
                  <div className="dialog-row">
                    {num(t('documents.setupRotation'), sel.rotate, (n) => rotateTo(n))}
                    <button onClick={() => rotateTo(sel.rotate + 90)}>
                      {t('documents.setupRotate90')}
                    </button>
                  </div>
                )}
                {sel.kind === 'text' ? (
                  <div className="setup-text">
                    <span>{t('documents.setupText')}</span>
                    <FormattedField
                      key={selected}
                      bar
                      singleLine
                      rows={3}
                      value={sel.text}
                      onChange={(text) => change({ text })}
                    />
                  </div>
                ) : sel.kind !== 'image' ? (
                  <div className="setup-text">
                    <span>{t('documents.anatomyLabel')}</span>
                    <FormattedField
                      key={selected}
                      bar
                      singleLine
                      value={sel.label}
                      onChange={(label) => change({ label })}
                    />
                  </div>
                ) : null}
                <div className="dialog-row">
                  <button onClick={duplicate}>{t('documents.setupDuplicate')}</button>
                  <button className="danger" onClick={remove}>
                    {t('documents.setupDelete')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>{t('documents.setupTable')}</h3>
                <label className="setup-check">
                  <input
                    type="checkbox"
                    checked={size !== null}
                    onChange={(e) =>
                      setSize(
                        e.target.checked
                          ? {
                              w: Math.ceil(Math.max(50, view.area.x + view.area.w)),
                              h: Math.ceil(Math.max(30, view.area.y + view.area.h))
                            }
                          : null
                      )
                    }
                  />
                  {t('documents.setupFixedSize')}
                </label>
                {size && (
                  <div className="dialog-row">
                    {num(t('documents.setupW'), size.w, (w) => setSize({ ...size, w }), 20)}
                    {num(t('documents.setupH'), size.h, (h) => setSize({ ...size, h }), 20)}
                  </div>
                )}
                <p className="muted small">{t('documents.setupHint')}</p>
              </>
            )}
          </div>
        </div>
        <div className="dialog-buttons">
          <button onClick={onClose}>{t('dialog.cancel')}</button>
          <button
            className="primary"
            disabled={!items.length}
            onClick={() => onSave(setupSource({ size, items }))}
          >
            {t(initial ? 'documents.saveAnatomy' : 'documents.insert')}
          </button>
        </div>
      </div>
      {pickingCard && (
        <InsertCardDialog
          pick={
            pickingCard.index !== undefined
              ? (items[pickingCard.index] as { card: string }).card
              : ''
          }
          sets={sets}
          templates={templates}
          project={project}
          onInsert={(card) => {
            const p = pickingCard
            setPickingCard(null)
            if (p.index !== undefined) {
              change({ card }, p.index)
              return
            }
            const c = center()
            const at = { from: 0, to: 0, x: c.x - 30, y: c.y - 40, rotate: 0, label: '' }
            add(
              p.kind === 'deck'
                ? { kind: 'deck', card, count: 10, ...at }
                : { kind: 'card', card, ...at }
            )
          }}
          onClose={() => setPickingCard(null)}
        />
      )}
      {pickingImage && (
        <AssetPicker
          value={
            pickingImage.index !== undefined
              ? (items[pickingImage.index] as { src: string }).src
              : ''
          }
          onPick={(src) => {
            const p = pickingImage
            setPickingImage(null)
            if (p.index !== undefined) {
              change({ src }, p.index)
              return
            }
            const c = center()
            const w = SETUP_IMAGE_W
            add({
              kind: 'image',
              src,
              x: c.x - w / 2,
              y: c.y - w / 2,
              w,
              rotate: 0,
              from: 0,
              to: 0
            })
          }}
          onClose={() => setPickingImage(null)}
        />
      )}
    </Dialog>
  )
}
