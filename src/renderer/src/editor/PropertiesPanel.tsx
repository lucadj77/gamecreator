import { useContext, useMemo, useState } from 'react'
import AssetPicker from '../components/AssetPicker'
import { ImageIcon } from '../components/icons'
import { P, Section } from './advanced'
import { findLayer, isNameTaken, patchLayer } from '../../../shared/model/edit'
import { assetRefName, isImageAsset, resolveAsset } from '../../../shared/model/assets'
import type {
  Anchor,
  CardShape,
  GroupLayout,
  LayoutAlign,
  BlendMode,
  Constraints,
  GroupLayer,
  ImageLayer,
  Layer,
  ShapeKind,
  ShapeLayer,
  Template,
  TextLayer,
  ValueLayer
} from '../../../shared/model/template'
import { walkLayers } from '../../../shared/model/normalize'
import { lineEnds, lineFromEnds, type Point } from '../../../shared/model/geometry'
import { useI18n, type Translate } from '../i18n/context'
import { evaluateFormula } from '../../../shared/model/formula'
import { cardFields, rowToCard, substituteFields, switchSource } from '../../../shared/model/bind'
import type { MessageKey } from '../i18n/en'
import { AssetsContext, assetUrl } from '../render/assets'
import { traceImage } from '../render/traceImage'
import {
  CheckField,
  ColorField,
  FontField,
  NumberField,
  SizeFields,
  FillField,
  FadeFields,
  SelectField,
  ShadowFields,
  StrokeField,
  TextField
} from './fields'
import type { EditorAction, EditorState } from './useEditor'
import type { Commands } from './commands'
import PanelSideButton from '../components/PanelSideButton'
import AlignSection from './AlignSection'
import type { PanelSide } from '../components/usePanelWidth'
import { useRatioLock, type LockKind } from './ratioLock'

interface Props {
  state: EditorState
  dispatch: React.Dispatch<EditorAction>
  cmd: Commands
  /** Intestazioni dei fogli dei set che usano il template */
  sheets: { set: string; headers: string[]; rows: string[][] }[]
  width: number
  /** Cambio di formato: chiede se scalare i livelli */
  onResize(width: number, height: number): void
  side: PanelSide
  onToggleSide(): void
}

export default function PropertiesPanel({
  state,
  dispatch,
  cmd,
  sheets,
  width,
  onResize,
  side: panelSide,
  onToggleSide
}: Props): React.JSX.Element {
  const { t } = useI18n()
  const { template: tpl, side, selection } = state
  const layer = selection.length === 1 ? findLayer(tpl[side], selection[0]) : null

  return (
    <aside className="properties" data-side={panelSide} style={{ width }}>
      <PanelSideButton side={panelSide} onToggle={onToggleSide} className="corner" />
      {selection.length > 0 && <AlignSection state={state} dispatch={dispatch} />}
      {selection.length > 1 ? (
        <>
          <h2>{t('editor.multiSelectionTitle', { n: selection.length })}</h2>
          <p className="muted small">{t('editor.multiSelection')}</p>
          <div className="selection-actions">
            <button disabled={!cmd.canGroup} onClick={cmd.group} title={t('tip.group')}>
              {t('layers.group')}
            </button>
            <button onClick={cmd.duplicate} title={t('tip.duplicate')}>
              {t('layers.duplicate')}
            </button>
            <button onClick={cmd.remove} title={t('tip.delete')}>
              {t('layers.delete')}
            </button>
          </div>
        </>
      ) : layer ? (
        <>
          <LayerProperties
            key={layer.id}
            layer={layer}
            state={state}
            dispatch={dispatch}
            sheets={sheets}
          />
          {layer.type === 'group' && (
            <div className="selection-actions">
              <button onClick={cmd.ungroup} title={t('tip.ungroup')}>
                {t('layers.ungroup')}
              </button>
            </div>
          )}
        </>
      ) : (
        <TemplateProperties
          template={tpl}
          dispatch={dispatch}
          sheets={sheets}
          onResize={onResize}
        />
      )}
    </aside>
  )
}

function TemplateProperties({
  template: tpl,
  dispatch,
  sheets,
  onResize
}: {
  template: Template
  dispatch: React.Dispatch<EditorAction>
  sheets: Props['sheets']
  onResize(width: number, height: number): void
}): React.JSX.Element {
  const { t } = useI18n()
  const [locked, setLocked] = useRatioLock('template')
  const set = (p: Partial<Template>, key: string): void =>
    dispatch({ type: 'change', template: { ...tpl, ...p }, key: `template.${key}` })
  return (
    <>
      <h2>{t('editor.templateProperties')}</h2>
      <div className="field">
        <span className="field-label">{t('prop.name')}</span>
        <span className="field-control">{tpl.name}</span>
      </div>
      <SizeFields
        labels={[t('prop.width'), t('prop.height')]}
        w={tpl.width}
        h={tpl.height}
        min={5}
        unit="mm"
        deferred
        layout="column"
        locked={locked}
        onLock={setLocked}
        // con il lucchetto l'altra misura si arrotonda al decimo di millimetro
        onChange={(w, h) =>
          locked ? onResize(Math.round(w * 10) / 10, Math.round(h * 10) / 10) : onResize(w, h)
        }
      />
      <NumberField
        label={t('prop.bleed')}
        value={tpl.bleed}
        min={0}
        unit="mm"
        onChange={(bleed) => set({ bleed }, 'bleed')}
      />
      <NumberField
        label={t('prop.safeMargin')}
        value={tpl.safeMargin}
        min={0}
        unit="mm"
        onChange={(safeMargin) => set({ safeMargin }, 'safeMargin')}
      />
      <SelectField<CardShape>
        label={t('prop.cardShape')}
        hint={t('editor.cardShapeHint')}
        value={tpl.shape ?? 'rect'}
        options={options(t, 'cardShape', ['rect', 'ellipse', 'hexagon', 'path'] as const)}
        onChange={(shape) => set({ shape }, 'shape')}
      />
      {(tpl.shape ?? 'rect') === 'rect' && (
        <NumberField
          label={t('prop.cornerRadius')}
          value={tpl.cornerRadius}
          min={0}
          unit="mm"
          onChange={(cornerRadius) => set({ cornerRadius }, 'cornerRadius')}
        />
      )}
      {tpl.shape === 'path' && (
        <OutlineField
          hint={t('editor.cardOutlineHint')}
          empty={!tpl.shapePath?.trim()}
          onTraced={({ path }) => set({ shapePath: path }, 'shapePath')}
        />
      )}
      <GuideFields template={tpl} set={set} />
      <SelectField<string>
        label={t('prop.labelField')}
        hint={t('editor.labelFieldHint')}
        value={tpl.labelField ?? ''}
        options={[
          ['', t('editor.labelFieldAuto')],
          ...labelChoices(tpl, sheets).map((f): [string, string] => [f, f])
        ]}
        onChange={(f) => set({ labelField: f || null }, 'labelField')}
      />
      <p className="muted small">{t('editor.noSelectionHint')}</p>
    </>
  )
}

/** Campi che possono dare il nome alle carte: colonne dei fogli e livelli del template */
function labelChoices(tpl: Template, sheets: Props['sheets']): string[] {
  const headers = sheets.flatMap((s) => s.headers).filter((h) => h !== 'amount' && !h.includes('.'))
  const layers = walkLayers([...tpl.front, ...tpl.back])
    .filter((l) => l.type !== 'group')
    .map((l) => l.name)
  const all = [...new Set([...headers, ...layers])]
  if (tpl.labelField && !all.includes(tpl.labelField)) all.push(tpl.labelField)
  return all
}

function LayerProperties({
  layer: l,
  state,
  dispatch,
  sheets
}: {
  layer: Layer
  state: EditorState
  dispatch: React.Dispatch<EditorAction>
  sheets: Props['sheets']
}): React.JSX.Element {
  const { t } = useI18n()
  const { template: tpl, side } = state
  const set = (patch: Partial<Layer>): void => {
    const key = `${l.id}.${Object.keys(patch).join(',')}`
    dispatch({ type: 'change', template: patchLayer(tpl, side, l.id, patch), key })
  }
  /** Colonna del foglio che sovrascrive la proprietà */
  const col = (prop?: string): string =>
    t('editor.columnHint', { column: prop ? `${l.name}.${prop}` : l.name })

  const validateName = (name: string): string | null => {
    if (!name.trim() || name.trim() !== name) return t('editor.nameEmpty')
    if (/[.{}[\]]/.test(name)) return t('editor.nameChars')
    if (isNameTaken(tpl, name, l.id)) return t('editor.nameTaken')
    return null
  }

  // con una formula il valore principale è calcolato: il campo del valore non serve
  const computed = l.source.kind === 'formula'

  return (
    <>
      <h2>
        {t(`layerType.${l.type}` as MessageKey)}
        {l.type === 'shape' && ` · ${t(`shape.${l.shape}` as MessageKey)}`}
      </h2>
      <TextField
        label={t('prop.name')}
        hint={t('editor.nameHint')}
        value={l.name}
        validate={validateName}
        onChange={(name) => set({ name })}
      />
      <ValueSource layer={l} template={tpl} sheets={sheets} set={set} />

      {l.type === 'text' && (
        <TextProperties
          l={l}
          set={set}
          col={col}
          computed={computed}
          fields={labelChoices(tpl, sheets)}
        />
      )}
      {l.type === 'image' && <ImageProperties l={l} set={set} col={col} computed={computed} />}
      {l.type === 'shape' && <ShapeProperties l={l} set={set} col={col} computed={computed} />}
      {l.type === 'value' && <ValueProperties l={l} set={set} col={col} computed={computed} />}
      {l.type === 'group' && <GroupProperties l={l as GroupLayer} set={set} col={col} />}

      {l.type !== 'value' && <DrawnProperties l={l} set={set} col={col} />}
    </>
  )
}

/** Forma presa dal contorno di un'immagine del progetto */
function OutlineField({
  hint,
  empty,
  onTraced
}: {
  hint: string
  empty: boolean
  onTraced(r: { path: string; ratio: number }): void
}): React.JSX.Element {
  const { t } = useI18n()
  const assets = useContext(AssetsContext)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState(false)
  const pick = async (name: string): Promise<void> => {
    setPicking(false)
    const r = resolveAsset(name, assets)
    try {
      if (!r.ok) throw new Error(name)
      const traced = await traceImage(assetUrl(r.path))
      if (!traced.path) throw new Error(name)
      setError(false)
      onTraced(traced)
    } catch {
      setError(true)
    }
  }
  return (
    <>
      <div className="field">
        <span className="field-label">{t('prop.outline')}</span>
        <div className="field-control">
          <button type="button" className="small-btn" onClick={() => setPicking(true)}>
            {t('editor.outlinePick')}
          </button>
          {empty && <span className="muted small">{t('editor.outlineEmpty')}</span>}
        </div>
      </div>
      {error && <p className="field-error">{t('editor.outlineFailed')}</p>}
      <p className="muted small">{hint}</p>
      {picking && <AssetPicker value="" onPick={pick} onClose={() => setPicking(false)} />}
    </>
  )
}

/** Guide manuali: si aggiungono qui e si spostano trascinandole sulla carta */
function GuideFields({
  template: tpl,
  set
}: {
  template: Template
  set(p: Partial<Template>, key: string): void
}): React.JSX.Element {
  const { t } = useI18n()
  const guides = tpl.guides ?? { x: [], y: [] }
  const change = (axis: 'x' | 'y', list: number[]): void =>
    set({ guides: { ...guides, [axis]: list } }, `guides.${axis}`)
  return (
    <>
      <h3>{t('editor.guides')}</h3>
      {(['x', 'y'] as const).map((axis) =>
        guides[axis].map((v, i) => (
          <div className="guide-row" key={`${axis}${i}`}>
            <NumberField
              label={t(axis === 'x' ? 'editor.guideV' : 'editor.guideH')}
              value={v}
              unit="mm"
              onChange={(n) =>
                change(
                  axis,
                  guides[axis].map((g, j) => (j === i ? n : g))
                )
              }
            />
            <button
              type="button"
              className="icon-btn"
              title={t('editor.guideRemove')}
              onClick={() =>
                change(
                  axis,
                  guides[axis].filter((_, j) => j !== i)
                )
              }
            >
              ×
            </button>
          </div>
        ))
      )}
      <div className="guide-buttons">
        <button
          type="button"
          className="small-btn"
          onClick={() => change('x', [...guides.x, tpl.width / 2])}
        >
          {t('editor.guideAddV')}
        </button>
        <button
          type="button"
          className="small-btn"
          onClick={() => change('y', [...guides.y, tpl.height / 2])}
        >
          {t('editor.guideAddH')}
        </button>
      </div>
      <p className="muted small">{t('editor.guidesHint')}</p>
    </>
  )
}

function GroupProperties({
  l,
  set,
  col
}: Omit<TypeProps<GroupLayer>, 'computed'>): React.JSX.Element {
  const { t } = useI18n()
  const arranged = l.layout !== 'none' || l.repeat.trim() !== '1'
  return (
    <>
      <CheckField
        label={t('prop.clip')}
        hint={t('editor.clipHint')}
        value={l.clip}
        onChange={(clip) => set({ clip })}
      />
      <h3>{t('editor.layout')}</h3>
      <SelectField<GroupLayout>
        label={t('prop.layout')}
        hint={t('editor.layoutHint')}
        value={l.layout}
        options={options(t, 'layout', ['none', 'row', 'column', 'grid'] as const)}
        onChange={(layout) => set({ layout })}
      />
      <TextField
        label={t('prop.repeat')}
        hint={`${t('editor.repeatHint')} ${col('repeat')}`}
        value={l.repeat}
        placeholder="1"
        validate={(v) =>
          !v.trim() || /^\s*\d+\s*$/.test(v) || /\{[^}]+\}/.test(v)
            ? null
            : t('editor.repeatInvalid')
        }
        onChange={(repeat) => set({ repeat: repeat.trim() || '1' })}
      />
      {arranged && (
        <>
          <NumberField
            label={t('prop.gap')}
            value={l.gap}
            unit="mm"
            step={0.5}
            onChange={(gap) => set({ gap })}
          />
          {l.layout === 'grid' && (
            <NumberField
              label={t('prop.columns')}
              value={l.columns}
              step={1}
              min={1}
              onChange={(columns) => set({ columns: Math.max(1, Math.round(columns)) })}
            />
          )}
          <SelectField<LayoutAlign>
            label={t('prop.justify')}
            value={l.justify}
            options={options(t, l.layout === 'column' ? 'justifyV' : 'justifyH', ALIGNS)}
            onChange={(justify) => set({ justify })}
          />
          <SelectField<LayoutAlign>
            label={t('prop.alignItems')}
            value={l.alignItems}
            options={options(t, l.layout === 'column' ? 'justifyH' : 'justifyV', ALIGNS)}
            onChange={(alignItems) => set({ alignItems })}
          />
          <p className="muted small">{t('editor.arrangedHint')}</p>
        </>
      )}
    </>
  )
}

const ALIGNS = ['start', 'center', 'end'] as const

/** Geometria e aspetto: i livelli valore non li hanno */
function DrawnProperties({ l, set, col }: Omit<TypeProps<Layer>, 'computed'>): React.JSX.Element {
  const { t } = useI18n()
  const [locked, setLocked] = useRatioLock(l.type as LockKind)
  const line = l.type === 'shape' && l.shape === 'line'
  const [a, b] = lineEnds(l)
  const ends = (p: Point, q: Point): void => set(lineFromEnds(l, p, q))
  const r = (v: number): number => Math.round(v * 100) / 100
  return (
    <>
      <Section scope="geometry" title={t('editor.geometry')}>
        {line ? (
          <div className="field-grid">
            <NumberField
              label="Ax"
              value={r(a.x)}
              unit="mm"
              onChange={(x) => ends({ ...a, x }, b)}
            />
            <NumberField
              label="Ay"
              value={r(a.y)}
              unit="mm"
              onChange={(y) => ends({ ...a, y }, b)}
            />
            <NumberField
              label="Bx"
              value={r(b.x)}
              unit="mm"
              onChange={(x) => ends(a, { ...b, x })}
            />
            <NumberField
              label="By"
              value={r(b.y)}
              unit="mm"
              onChange={(y) => ends(a, { ...b, y })}
            />
            <NumberField
              label="L"
              hint={t('prop.length')}
              value={r(l.w)}
              min={0}
              unit="mm"
              onChange={(w) => set({ w })}
            />
          </div>
        ) : (
          <div className="field-grid">
            <NumberField
              label="X"
              hint={col('x')}
              value={l.x}
              unit="mm"
              onChange={(x) => set({ x })}
            />
            <NumberField
              label="Y"
              hint={col('y')}
              value={l.y}
              unit="mm"
              onChange={(y) => set({ y })}
            />
            <SizeFields
              labels={[t('prop.w'), t('prop.h')]}
              hints={[col('w'), col('h')]}
              w={l.w}
              h={l.h}
              min={0.5}
              unit="mm"
              locked={locked}
              onLock={setLocked}
              onChange={(w, h) => set({ w, h })}
            />
          </div>
        )}
        {line && <p className="muted small">{t('editor.lineHint')}</p>}
        <P id="rotation">
          <NumberField
            label={t('prop.rotation')}
            hint={col('rotation')}
            value={l.rotation}
            step={1}
            min={-360}
            max={360}
            unit="°"
            onChange={(rotation) => set({ rotation })}
          />
        </P>
        <P id="anchor" adv>
          <SelectField<Anchor>
            label={t('prop.anchor')}
            hint={t('editor.anchorHint')}
            value={l.anchor}
            options={ANCHORS.map((a) => [a, t(`anchor.${a}` as MessageKey)])}
            onChange={(anchor) => set({ anchor })}
          />
        </P>
        <P id="constraintH" adv>
          <SelectField<Constraints['h']>
            label={t('prop.constraintH')}
            hint={t('editor.constraintsHint')}
            value={l.constraints.h}
            options={options(t, 'constraintH', [
              'left',
              'right',
              'center',
              'both',
              'scale'
            ] as const)}
            onChange={(h) => set({ constraints: { ...l.constraints, h } })}
          />
        </P>
        <P id="constraintV" adv>
          <SelectField<Constraints['v']>
            label={t('prop.constraintV')}
            hint={t('editor.constraintsHint')}
            value={l.constraints.v}
            options={options(t, 'constraintV', [
              'top',
              'bottom',
              'center',
              'both',
              'scale'
            ] as const)}
            onChange={(v) => set({ constraints: { ...l.constraints, v } })}
          />
        </P>
      </Section>
      <Section scope="appearance" title={t('editor.appearance')}>
        <P id="opacity">
          <NumberField
            label={t('prop.opacity')}
            hint={col('opacity')}
            value={l.opacity}
            factor={100}
            step={5}
            min={0}
            max={1}
            unit="%"
            onChange={(opacity) => set({ opacity })}
          />
        </P>
        <P id="blend" adv>
          <SelectField<BlendMode>
            label={t('prop.blend')}
            hint={col('blend')}
            value={l.blend}
            options={options(t, 'blend', ['normal', 'multiply', 'screen', 'overlay'] as const)}
            onChange={(blend) => set({ blend })}
          />
        </P>
        <P id="fade" adv>
          <FadeFields
            value={l.fade}
            hint={t('editor.fadeHint')}
            onChange={(fade) => set({ fade })}
          />
        </P>
        <P id="shadow" adv>
          <ShadowFields
            value={l.shadow}
            hint={col('shadow')}
            onChange={(shadow) => set({ shadow })}
          />
        </P>
        <P id="visible">
          <CheckField
            label={t('prop.visible')}
            hint={l.type === 'group' ? col() : col('visible')}
            disabled={l.type === 'group' && l.source.kind === 'formula'}
            value={l.visible}
            onChange={(visible) => set({ visible })}
          />
        </P>
        <P id="locked" adv>
          <CheckField
            label={t('prop.locked')}
            hint={t('editor.lockedHint')}
            value={l.locked}
            onChange={(locked) => set({ locked })}
          />
        </P>
      </Section>
    </>
  )
}

type SetFn<T> = (patch: Partial<T>) => void
interface TypeProps<T> {
  l: T
  set: SetFn<Layer>
  col(prop?: string): string
  /** Il valore principale viene da una formula */
  computed: boolean
  /** Campi della carta, per l'aiuto alla scrittura del markup */
  fields?: string[]
}

function options<T extends string>(
  t: Translate,
  prefix: string,
  values: readonly T[]
): [T, string][] {
  return values.map((v) => [v, t(`${prefix}.${v}` as MessageKey)])
}

const ANCHORS: Anchor[] = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right'
]
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900]

function TextProperties({
  l,
  set: setLayer,
  col,
  computed,
  fields
}: TypeProps<TextLayer>): React.JSX.Element {
  const { t } = useI18n()
  const set = setLayer as SetFn<TextLayer>
  return (
    <>
      {/* con una formula il valore è il suo risultato: il campo non serve */}
      {!computed && (
        <TextField
          label={t('prop.text')}
          hint={col()}
          value={l.text}
          multiline
          markupFields={fields}
          onChange={(text) => set({ text })}
        />
      )}
      <Section scope="text" title={t('editor.typography')}>
        <P id="font">
          <FontField
            label={t('prop.font')}
            hint={col('font')}
            value={l.font}
            onChange={(font) => set({ font })}
          />
        </P>
        <P id="weight">
          <SelectField<number>
            label={t('prop.weight')}
            hint={col('weight')}
            value={l.weight}
            options={WEIGHTS.map((w) => [w, `${w} · ${t(`weight.${w}` as MessageKey)}`])}
            onChange={(weight) => set({ weight })}
          />
        </P>
        <P id="italic">
          <CheckField
            label={t('prop.italic')}
            hint={col('italic')}
            value={l.italic}
            onChange={(italic) => set({ italic })}
          />
        </P>
        <P id="size">
          <NumberField
            label={t('prop.size')}
            hint={col('size')}
            value={l.size}
            min={1}
            unit="pt"
            onChange={(size) => set({ size })}
          />
        </P>
        <P id="color">
          <ColorField
            label={t('prop.color')}
            hint={col('color')}
            value={l.color}
            onChange={(color) => color && set({ color })}
          />
        </P>
        <P id="align">
          <SelectField
            label={t('prop.align')}
            hint={col('align')}
            value={l.align}
            options={options(t, 'align', ['left', 'center', 'right', 'justify'] as const)}
            onChange={(align) => set({ align })}
          />
        </P>
        <P id="valign">
          <SelectField
            label={t('prop.valign')}
            hint={col('valign')}
            value={l.valign}
            options={options(t, 'valign', ['top', 'middle', 'bottom'] as const)}
            onChange={(valign) => set({ valign })}
          />
        </P>
        <P id="lineHeight">
          <NumberField
            label={t('prop.lineHeight')}
            hint={col('lineHeight')}
            value={l.lineHeight}
            step={0.05}
            min={0.5}
            onChange={(lineHeight) => set({ lineHeight })}
          />
        </P>
        <P id="letterSpacing" adv>
          <NumberField
            label={t('prop.letterSpacing')}
            hint={col('letterSpacing')}
            value={l.letterSpacing}
            step={10}
            onChange={(letterSpacing) => set({ letterSpacing })}
          />
        </P>
        <P id="paragraphSpacing" adv>
          <NumberField
            label={t('prop.paragraphSpacing')}
            hint={col('paragraphSpacing')}
            value={l.paragraphSpacing}
            min={0}
            unit="mm"
            onChange={(paragraphSpacing) => set({ paragraphSpacing })}
          />
        </P>
        <P id="indent" adv>
          <NumberField
            label={t('prop.indent')}
            hint={col('indent')}
            value={l.indent}
            unit="mm"
            onChange={(indent) => set({ indent })}
          />
        </P>
        <P id="padding" adv>
          <NumberField
            label={t('prop.padding')}
            hint={col('padding')}
            value={l.padding}
            min={0}
            unit="mm"
            disabled={!!l.paddingSides}
            onChange={(padding) => set({ padding })}
          />
        </P>
        <P id="paddingSides" adv>
          <CheckField
            label={t('prop.paddingSides')}
            hint={t('editor.paddingSidesHint')}
            value={!!l.paddingSides}
            onChange={(on) =>
              set({ paddingSides: on ? [l.padding, l.padding, l.padding, l.padding] : null })
            }
          />
          {l.paddingSides && (
            <div className="field-grid sides-grid">
              {(['top', 'right', 'bottom', 'left'] as const).map((side, i) => (
                <NumberField
                  key={side}
                  label={t(`side.${side}` as MessageKey)}
                  value={l.paddingSides![i]}
                  min={0}
                  unit="mm"
                  onChange={(v) => {
                    const next = [...l.paddingSides!] as [number, number, number, number]
                    next[i] = v
                    set({ paddingSides: next })
                  }}
                />
              ))}
            </div>
          )}
        </P>
        <P id="transform" adv>
          <SelectField
            label={t('prop.transform')}
            hint={col('transform')}
            value={l.transform}
            options={options(t, 'transform', ['none', 'upper', 'lower', 'capitalize'] as const)}
            onChange={(transform) => set({ transform })}
          />
        </P>
        <P id="underline" adv>
          <CheckField
            label={t('prop.underline')}
            hint={col('underline')}
            value={l.underline}
            onChange={(underline) => set({ underline })}
          />
        </P>
        <P id="strike" adv>
          <CheckField
            label={t('prop.strike')}
            hint={col('strike')}
            value={l.strike}
            onChange={(strike) => set({ strike })}
          />
        </P>
        <P id="wrap" adv>
          <CheckField
            label={t('prop.wrap')}
            hint={col('wrap')}
            value={l.wrap}
            onChange={(wrap) => set({ wrap })}
          />
        </P>
        <P id="stroke" adv>
          <StrokeField
            label={t('prop.stroke')}
            hint={col('stroke')}
            value={l.stroke}
            allowPercent
            onChange={(stroke) => set({ stroke })}
          />
        </P>
        <P id="fit">
          <SelectField
            label={t('prop.fit')}
            hint={col('fit')}
            value={l.fit}
            options={options(t, 'textFit', ['none', 'shrink', 'truncate'] as const)}
            onChange={(fit) => set({ fit })}
          />
        </P>
        {l.fit === 'shrink' && (
          <P id="minSize">
            <NumberField
              label={t('prop.minSize')}
              hint={col('minSize')}
              value={l.minSize}
              min={1}
              unit="pt"
              onChange={(minSize) => set({ minSize })}
            />
          </P>
        )}
      </Section>
    </>
  )
}

/** Nomi brevi dei file immagine: è come si scrivono nel foglio */
function useAssetNames(): string[] {
  const assets = useContext(AssetsContext)
  return useMemo(
    () => [...new Set(assets.filter(isImageAsset).map((a) => assetRefName(a, assets)))].sort(),
    [assets]
  )
}

function ImageProperties({
  l,
  set: setLayer,
  col,
  computed
}: TypeProps<ImageLayer>): React.JSX.Element {
  const { t } = useI18n()
  const set = setLayer as SetFn<ImageLayer>
  const names = useAssetNames()
  const assets = useContext(AssetsContext)
  const res = resolveAsset(l.src, assets)
  const listId = `assets-${l.id}`
  const [picking, setPicking] = useState(false)
  return (
    <>
      {/* con una formula il valore è il suo risultato: il campo non serve */}
      {!computed && (
        <TextField
          label={t('prop.src')}
          hint={col()}
          value={l.src}
          list={listId}
          placeholder={t('editor.srcPlaceholder')}
          onChange={(src) => set({ src })}
          action={
            <button
              className="pick-btn"
              title={t('assetPicker.open')}
              onClick={() => setPicking(true)}
            >
              <ImageIcon />
            </button>
          }
        />
      )}
      {picking && (
        <AssetPicker
          value={l.src}
          onPick={(src) => set({ src })}
          onClose={() => setPicking(false)}
        />
      )}
      <datalist id={listId}>
        {names.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      {!computed && !res.ok && res.reason !== 'empty' && !l.src.includes('{') && (
        <p className="field-note">
          {res.reason === 'ambiguous'
            ? t('editor.srcAmbiguous', { files: res.candidates.join(', ') })
            : t('editor.srcMissing')}
        </p>
      )}
      <Section scope="image">
        <P id="fit">
          <SelectField
            label={t('prop.fit')}
            hint={col('fit')}
            value={l.fit}
            options={options(t, 'imageFit', [
              'cover',
              'contain',
              'stretch',
              'original',
              'tile'
            ] as const)}
            onChange={(fit) => set({ fit })}
          />
        </P>
        {l.fit !== 'stretch' && (
          <P id="align">
            <SelectField<Anchor>
              label={t('prop.imageAlign')}
              hint={col('align')}
              value={l.align}
              options={ANCHORS.map((a) => [a, t(`anchor.${a}` as MessageKey)])}
              onChange={(align) => set({ align })}
            />
          </P>
        )}
        <P id="zoom">
          <NumberField
            label={t('prop.zoom')}
            hint={`${t('editor.zoomImageHint')} ${col('zoom')}`}
            value={l.zoom}
            factor={100}
            step={5}
            min={0.01}
            unit="%"
            onChange={(zoom) => set({ zoom })}
          />
        </P>
        <P id="imageRotation">
          <NumberField
            label={t('prop.imageRotation')}
            hint={`${t('editor.imageRotationHint')} ${col('imageRotation')}`}
            value={l.imageRotation}
            step={90}
            min={-360}
            max={360}
            unit="°"
            onChange={(imageRotation) => set({ imageRotation })}
          />
        </P>
        <P id="offsetX">
          <NumberField
            label={t('prop.offsetX')}
            hint={col('offsetX')}
            value={l.offsetX}
            unit="mm"
            onChange={(offsetX) => set({ offsetX })}
          />
        </P>
        <P id="offsetY">
          <NumberField
            label={t('prop.offsetY')}
            hint={col('offsetY')}
            value={l.offsetY}
            unit="mm"
            onChange={(offsetY) => set({ offsetY })}
          />
        </P>
        <P id="flipH" adv>
          <CheckField
            label={t('prop.flipH')}
            hint={col('flipH')}
            value={l.flipH}
            onChange={(flipH) => set({ flipH })}
          />
        </P>
        <P id="flipV" adv>
          <CheckField
            label={t('prop.flipV')}
            hint={col('flipV')}
            value={l.flipV}
            onChange={(flipV) => set({ flipV })}
          />
        </P>
        <P id="tint">
          <ColorField
            label={t('prop.tint')}
            hint={col('tint')}
            value={l.tint}
            nullable
            onChange={(tint) => set({ tint })}
          />
        </P>
        <P id="grayscale" adv>
          <CheckField
            label={t('prop.grayscale')}
            hint={col('grayscale')}
            value={l.grayscale}
            onChange={(grayscale) => set({ grayscale })}
          />
        </P>
        <P id="brightness" adv>
          <NumberField
            label={t('prop.brightness')}
            hint={col('brightness')}
            value={l.brightness}
            factor={100}
            step={5}
            min={0}
            unit="%"
            onChange={(brightness) => set({ brightness })}
          />
        </P>
        <P id="contrast" adv>
          <NumberField
            label={t('prop.contrast')}
            hint={col('contrast')}
            value={l.contrast}
            factor={100}
            step={5}
            min={0}
            unit="%"
            onChange={(contrast) => set({ contrast })}
          />
        </P>
        {!l.grayscale && (
          <P id="saturation" adv>
            <NumberField
              label={t('prop.saturation')}
              hint={col('saturation')}
              value={l.saturation}
              factor={100}
              step={5}
              min={0}
              unit="%"
              onChange={(saturation) => set({ saturation })}
            />
          </P>
        )}
        <P id="radius" adv>
          <NumberField
            label={t('prop.radius')}
            hint={col('radius')}
            value={l.radius}
            min={0}
            unit="mm"
            onChange={(radius) => set({ radius })}
          />
        </P>
        <P id="stroke" adv>
          <StrokeField
            label={t('prop.stroke')}
            hint={col('stroke')}
            value={l.stroke}
            dashable
            onChange={(stroke) => set({ stroke })}
          />
        </P>
        <P id="missing" adv>
          <SelectField
            label={t('prop.missing')}
            hint={col('missing')}
            value={l.missing}
            options={options(t, 'missing', ['placeholder', 'hide'] as const)}
            onChange={(missing) => set({ missing })}
          />
        </P>
      </Section>
    </>
  )
}

function ValueProperties({
  l,
  set: setLayer,
  col,
  computed
}: TypeProps<ValueLayer>): React.JSX.Element {
  const { t } = useI18n()
  const set = setLayer as SetFn<ValueLayer>
  return (
    <>
      {/* con una formula il valore è il suo risultato: il campo non serve */}
      {!computed && (
        <TextField
          label={t('prop.value')}
          hint={col()}
          value={l.value}
          onChange={(value) => set({ value })}
        />
      )}
      <p className="small muted">{t('editor.valueHint', { name: l.name })}</p>
    </>
  )
}

const SHAPES: ShapeKind[] = ['rect', 'ellipse', 'polygon', 'star', 'line', 'path']

function ShapeProperties({
  l,
  set: setLayer,
  col,
  computed
}: TypeProps<ShapeLayer>): React.JSX.Element {
  const { t } = useI18n()
  const set = setLayer as SetFn<ShapeLayer>
  return (
    <>
      <Section scope="shape">
        <P id="shape">
          <SelectField<ShapeKind>
            label={t('prop.shape')}
            hint={col('shape')}
            value={l.shape}
            options={options(t, 'shape', SHAPES)}
            onChange={(shape) => set({ shape })}
          />
        </P>
        {/* con una formula il valore è il suo risultato: il campo non serve */}
        {!computed && (
          <P id="fill">
            <FillField
              label={t('prop.fill')}
              hint={col()}
              value={l.fill}
              fallback="#CCCCCC"
              onChange={(fill) => set({ fill })}
            />
          </P>
        )}
        <P id="stroke">
          <StrokeField
            label={t('prop.stroke')}
            hint={col('stroke')}
            value={l.stroke}
            dashable
            onChange={(stroke) => set({ stroke })}
          />
        </P>
        {(l.shape === 'rect' || l.shape === 'polygon' || l.shape === 'star') && (
          <P id="radius">
            <NumberField
              label={t('prop.radius')}
              hint={col('radius')}
              value={l.radius}
              min={0}
              unit="mm"
              onChange={(radius) => set({ radius })}
            />
          </P>
        )}
        {(l.shape === 'polygon' || l.shape === 'star') && (
          <P id="sides">
            <NumberField
              label={l.shape === 'star' ? t('prop.points') : t('prop.sides')}
              hint={col('sides')}
              value={l.sides}
              step={1}
              min={3}
              max={64}
              onChange={(sides) => set({ sides: Math.round(sides) })}
            />
          </P>
        )}
        {l.shape === 'star' && (
          <P id="innerRatio">
            <NumberField
              label={t('prop.innerRatio')}
              hint={col('innerRatio')}
              value={l.innerRatio}
              factor={100}
              step={5}
              min={0.05}
              max={1}
              unit="%"
              onChange={(innerRatio) => set({ innerRatio })}
            />
          </P>
        )}
        {l.shape === 'path' && (
          <OutlineField
            hint={t('editor.outlineHint')}
            empty={!l.path.trim()}
            // l'altezza segue le proporzioni dell'immagine
            onTraced={({ path, ratio }) => set({ path, h: Math.round((l.w / ratio) * 100) / 100 })}
          />
        )}
      </Section>
    </>
  )
}

/** Valore principale sulle carte: colonna del foglio, valore fisso o formula */
function ValueSource({
  layer: l,
  template,
  sheets,
  set
}: {
  layer: Layer
  template: Template
  sheets: Props['sheets']
  set(patch: Partial<Layer>): void
}): React.JSX.Element {
  const { t } = useI18n()
  const src = l.source
  const column = src.kind === 'column' && src.column ? src.column : l.name
  const found = sheets.filter((s) => s.headers.includes(column)).map((s) => s.set)
  const others = [
    ...new Set(sheets.flatMap((s) => s.headers.filter((h) => h.startsWith(column + '.'))))
  ]
  const headers = [...new Set(sheets.flatMap((s) => s.headers))].filter(
    (h) => h !== 'amount' && !h.includes('.')
  )
  // anteprima della formula sulla prima riga disponibile, o con i soli valori del template
  const sample = sheets.find((s) => s.rows.length)
  const fields = cardFields(
    template,
    sample ? rowToCard(sample.headers, sample.rows[0]) : { fields: {}, amount: 1 }
  )
  const result = src.kind === 'formula' ? evaluateFormula(src.expr, fields) : null
  // come sulla carta: i {campo} rimasti nel risultato si sostituiscono
  const preview = result && { ...result, value: substituteFields(result.value, fields) }
  const listId = `columns-${l.id}`

  return (
    <div className="value-source">
      <SelectField<ValueSourceKind>
        label={t('source.label')}
        value={src.kind}
        options={[
          ['column', t('source.kind.column')],
          ['fixed', t('source.kind.fixed')],
          ['formula', t('source.kind.formula')]
        ]}
        onChange={(kind) => set({ source: switchSource(l, kind) })}
      />
      {src.kind === 'column' && (
        <>
          <TextField
            label={t('source.column')}
            value={src.column ?? ''}
            placeholder={l.name}
            list={listId}
            hint={t('source.columnHint')}
            onChange={(c) => set({ source: { kind: 'column', column: c.trim() || null } })}
          />
          <datalist id={listId}>
            {headers.map((h) => (
              <option key={h} value={h} />
            ))}
          </datalist>
        </>
      )}
      {src.kind === 'formula' && (
        <TextField
          label={t('source.formula')}
          value={src.expr}
          hint={t('source.formulaHint')}
          multiline
          rows={3}
          onChange={(expr) => set({ source: { kind: 'formula', expr } })}
        />
      )}
      {src.kind === 'formula' && <p className="small muted">{t('source.formulaHelp')}</p>}
      <p className="small muted">
        {src.kind === 'fixed'
          ? t('source.fixedNote')
          : src.kind === 'formula'
            ? preview?.error
              ? t('source.formulaError', { error: preview.error })
              : sample
                ? t('source.formulaPreview', { value: preview?.value || '∅', set: sample.set })
                : t('source.formulaPreviewDefaults', { value: preview?.value || '∅' })
            : l.type === 'value' && !found.length && !src.column
              ? t('source.valueColumn', { column })
              : found.length
                ? t('source.columnFound', { column, sets: found.join(', ') })
                : t('source.columnMissing', { column })}
        {others.length > 0 && (
          <>
            <br />
            {t('source.properties', { columns: others.join(', ') })}
          </>
        )}
      </p>
    </div>
  )
}

type ValueSourceKind = Layer['source']['kind']
