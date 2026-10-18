import { useContext, useMemo } from 'react'
import { findLayer, isNameTaken, patchLayer } from '../../../shared/model/edit'
import { IMAGE_EXTENSIONS, resolveAsset } from '../../../shared/model/assets'
import type {
  Anchor,
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
import { useI18n, type Translate } from '../i18n/context'
import { evaluateFormula } from '../../../shared/model/formula'
import { cardFields, rowToCard, substituteFields, switchSource } from '../../../shared/model/bind'
import type { MessageKey } from '../i18n/en'
import { AssetsContext } from '../render/assets'
import {
  CheckField,
  ColorField,
  NumberField,
  SelectField,
  ShadowFields,
  StrokeField,
  TextField
} from './fields'
import type { EditorAction, EditorState } from './useEditor'
import type { Commands } from './commands'

interface Props {
  state: EditorState
  dispatch: React.Dispatch<EditorAction>
  cmd: Commands
  /** Intestazioni dei fogli dei set che usano il template */
  sheets: { set: string; headers: string[]; rows: string[][] }[]
  width: number
  /** Cambio di formato: chiede se scalare i livelli */
  onResize(width: number, height: number): void
}

export default function PropertiesPanel({
  state,
  dispatch,
  cmd,
  sheets,
  width,
  onResize
}: Props): React.JSX.Element {
  const { t } = useI18n()
  const { template: tpl, side, selection } = state
  const layer = selection.length === 1 ? findLayer(tpl[side], selection[0]) : null

  return (
    <aside className="properties" style={{ width }}>
      {selection.length > 1 ? (
        <>
          <h2>{t('editor.multiSelectionTitle', { n: selection.length })}</h2>
          <p className="muted small">{t('editor.multiSelection')}</p>
          <div className="selection-actions">
            <button disabled={!cmd.canGroup} onClick={cmd.group}>
              {t('layers.group')}
            </button>
            <button onClick={cmd.duplicate}>{t('layers.duplicate')}</button>
            <button onClick={cmd.remove}>{t('layers.delete')}</button>
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
              <button onClick={cmd.ungroup}>{t('layers.ungroup')}</button>
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
  const set = (p: Partial<Template>, key: string): void =>
    dispatch({ type: 'change', template: { ...tpl, ...p }, key: `template.${key}` })
  return (
    <>
      <h2>{t('editor.templateProperties')}</h2>
      <div className="field">
        <span className="field-label">{t('prop.name')}</span>
        <span className="field-control">{tpl.name}</span>
      </div>
      <NumberField
        label={t('prop.width')}
        value={tpl.width}
        min={5}
        unit="mm"
        deferred
        onChange={(w) => onResize(w, tpl.height)}
      />
      <NumberField
        label={t('prop.height')}
        value={tpl.height}
        min={5}
        unit="mm"
        deferred
        onChange={(h) => onResize(tpl.width, h)}
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
      <NumberField
        label={t('prop.cornerRadius')}
        value={tpl.cornerRadius}
        min={0}
        unit="mm"
        onChange={(cornerRadius) => set({ cornerRadius }, 'cornerRadius')}
      />
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

      {l.type === 'text' && <TextProperties l={l} set={set} col={col} computed={computed} />}
      {l.type === 'image' && <ImageProperties l={l} set={set} col={col} computed={computed} />}
      {l.type === 'shape' && <ShapeProperties l={l} set={set} col={col} computed={computed} />}
      {l.type === 'value' && <ValueProperties l={l} set={set} col={col} computed={computed} />}
      {l.type === 'group' && (
        <CheckField
          label={t('prop.clip')}
          hint={t('editor.clipHint')}
          value={(l as GroupLayer).clip}
          onChange={(clip) => set({ clip } as Partial<GroupLayer>)}
        />
      )}

      {l.type !== 'value' && <DrawnProperties l={l} set={set} col={col} />}
    </>
  )
}

/** Geometria e aspetto: i livelli valore non li hanno */
function DrawnProperties({ l, set, col }: Omit<TypeProps<Layer>, 'computed'>): React.JSX.Element {
  const { t } = useI18n()
  return (
    <>
      <h3>{t('editor.geometry')}</h3>
      <div className="field-grid">
        <NumberField label="X" hint={col('x')} value={l.x} unit="mm" onChange={(x) => set({ x })} />
        <NumberField label="Y" hint={col('y')} value={l.y} unit="mm" onChange={(y) => set({ y })} />
        <NumberField
          label={t('prop.w')}
          hint={col('w')}
          value={l.w}
          min={0.5}
          unit="mm"
          onChange={(w) => set({ w })}
        />
        <NumberField
          label={t('prop.h')}
          hint={col('h')}
          value={l.h}
          min={0.5}
          unit="mm"
          onChange={(h) => set({ h })}
        />
      </div>
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
      <SelectField<Anchor>
        label={t('prop.anchor')}
        hint={t('editor.anchorHint')}
        value={l.anchor}
        options={ANCHORS.map((a) => [a, t(`anchor.${a}` as MessageKey)])}
        onChange={(anchor) => set({ anchor })}
      />

      <h3>{t('editor.appearance')}</h3>
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
      <ShadowFields value={l.shadow} hint={col('shadow')} onChange={(shadow) => set({ shadow })} />
      <CheckField
        label={t('prop.visible')}
        hint={l.type === 'group' ? col() : col('visible')}
        disabled={l.type === 'group' && l.source.kind === 'formula'}
        value={l.visible}
        onChange={(visible) => set({ visible })}
      />
      <CheckField
        label={t('prop.locked')}
        hint={t('editor.lockedHint')}
        value={l.locked}
        onChange={(locked) => set({ locked })}
      />
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
  computed
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
          onChange={(text) => set({ text })}
        />
      )}
      <h3>{t('editor.typography')}</h3>
      <TextField
        label={t('prop.font')}
        hint={col('font')}
        value={l.font}
        onChange={(font) => set({ font })}
      />
      <SelectField<number>
        label={t('prop.weight')}
        hint={col('weight')}
        value={l.weight}
        options={WEIGHTS.map((w) => [w, `${w} · ${t(`weight.${w}` as MessageKey)}`])}
        onChange={(weight) => set({ weight })}
      />
      <CheckField
        label={t('prop.italic')}
        hint={col('italic')}
        value={l.italic}
        onChange={(italic) => set({ italic })}
      />
      <NumberField
        label={t('prop.size')}
        hint={col('size')}
        value={l.size}
        min={1}
        unit="pt"
        onChange={(size) => set({ size })}
      />
      <ColorField
        label={t('prop.color')}
        hint={col('color')}
        value={l.color}
        onChange={(color) => color && set({ color })}
      />
      <SelectField
        label={t('prop.align')}
        hint={col('align')}
        value={l.align}
        options={options(t, 'align', ['left', 'center', 'right', 'justify'] as const)}
        onChange={(align) => set({ align })}
      />
      <SelectField
        label={t('prop.valign')}
        hint={col('valign')}
        value={l.valign}
        options={options(t, 'valign', ['top', 'middle', 'bottom'] as const)}
        onChange={(valign) => set({ valign })}
      />
      <NumberField
        label={t('prop.lineHeight')}
        hint={col('lineHeight')}
        value={l.lineHeight}
        step={0.05}
        min={0.5}
        onChange={(lineHeight) => set({ lineHeight })}
      />
      <NumberField
        label={t('prop.letterSpacing')}
        hint={col('letterSpacing')}
        value={l.letterSpacing}
        step={10}
        onChange={(letterSpacing) => set({ letterSpacing })}
      />
      <NumberField
        label={t('prop.paragraphSpacing')}
        hint={col('paragraphSpacing')}
        value={l.paragraphSpacing}
        min={0}
        unit="mm"
        onChange={(paragraphSpacing) => set({ paragraphSpacing })}
      />
      <NumberField
        label={t('prop.padding')}
        hint={col('padding')}
        value={l.padding}
        min={0}
        unit="mm"
        onChange={(padding) => set({ padding })}
      />
      <SelectField
        label={t('prop.transform')}
        hint={col('transform')}
        value={l.transform}
        options={options(t, 'transform', ['none', 'upper', 'lower', 'capitalize'] as const)}
        onChange={(transform) => set({ transform })}
      />
      <StrokeField
        label={t('prop.stroke')}
        hint={col('stroke')}
        value={l.stroke}
        allowPercent
        onChange={(stroke) => set({ stroke })}
      />
      <SelectField
        label={t('prop.fit')}
        hint={col('fit')}
        value={l.fit}
        options={options(t, 'textFit', ['none', 'shrink', 'truncate'] as const)}
        onChange={(fit) => set({ fit })}
      />
      {l.fit === 'shrink' && (
        <NumberField
          label={t('prop.minSize')}
          hint={col('minSize')}
          value={l.minSize}
          min={1}
          unit="pt"
          onChange={(minSize) => set({ minSize })}
        />
      )}
    </>
  )
}

/** Nomi brevi dei file immagine: è come si scrivono nel foglio */
function useAssetNames(): string[] {
  const assets = useContext(AssetsContext)
  return useMemo(() => {
    const images = assets.filter((a) => IMAGE_EXTENSIONS.some((e) => a.toLowerCase().endsWith(e)))
    const names = images.map((a) => {
      const stem = a.slice(a.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
      // se il nome breve è ambiguo si propone con la cartella
      return resolveAsset(stem, assets).ok ? stem : a.replace(/\.[^.]+$/, '')
    })
    return [...new Set(names)].sort()
  }, [assets])
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
      <SelectField
        label={t('prop.fit')}
        hint={col('fit')}
        value={l.fit}
        options={options(t, 'imageFit', ['cover', 'contain', 'stretch', 'original'] as const)}
        onChange={(fit) => set({ fit })}
      />
      <CheckField
        label={t('prop.flipH')}
        hint={col('flipH')}
        value={l.flipH}
        onChange={(flipH) => set({ flipH })}
      />
      <CheckField
        label={t('prop.flipV')}
        hint={col('flipV')}
        value={l.flipV}
        onChange={(flipV) => set({ flipV })}
      />
      <ColorField
        label={t('prop.tint')}
        hint={col('tint')}
        value={l.tint}
        nullable
        onChange={(tint) => set({ tint })}
      />
      <NumberField
        label={t('prop.radius')}
        hint={col('radius')}
        value={l.radius}
        min={0}
        unit="mm"
        onChange={(radius) => set({ radius })}
      />
      <StrokeField
        label={t('prop.stroke')}
        hint={col('stroke')}
        value={l.stroke}
        onChange={(stroke) => set({ stroke })}
      />
      <SelectField
        label={t('prop.missing')}
        hint={col('missing')}
        value={l.missing}
        options={options(t, 'missing', ['placeholder', 'hide'] as const)}
        onChange={(missing) => set({ missing })}
      />
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
      <SelectField<ShapeKind>
        label={t('prop.shape')}
        hint={col('shape')}
        value={l.shape}
        options={options(t, 'shape', SHAPES)}
        onChange={(shape) => set({ shape })}
      />
      {/* con una formula il valore è il suo risultato: il campo non serve */}
      {!computed && (
        <ColorField
          label={t('prop.fill')}
          hint={col()}
          value={l.fill}
          nullable
          fallback="#CCCCCC"
          onChange={(fill) => set({ fill })}
        />
      )}
      <StrokeField
        label={t('prop.stroke')}
        hint={col('stroke')}
        value={l.stroke}
        onChange={(stroke) => set({ stroke })}
      />
      {l.shape === 'rect' && (
        <NumberField
          label={t('prop.radius')}
          hint={col('radius')}
          value={l.radius}
          min={0}
          unit="mm"
          onChange={(radius) => set({ radius })}
        />
      )}
      {(l.shape === 'polygon' || l.shape === 'star') && (
        <NumberField
          label={l.shape === 'star' ? t('prop.points') : t('prop.sides')}
          hint={col('sides')}
          value={l.sides}
          step={1}
          min={3}
          max={64}
          onChange={(sides) => set({ sides: Math.round(sides) })}
        />
      )}
      {l.shape === 'star' && (
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
      )}
      {l.shape === 'path' && (
        <TextField
          label={t('prop.path')}
          hint={t('editor.pathHint')}
          value={l.path}
          multiline
          onChange={(path) => set({ path })}
        />
      )}
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
