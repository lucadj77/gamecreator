import { useEffect, useMemo, useState } from 'react'
import type { LoadedProject } from '../../../shared/project'
import { bindCard, cardFields, rowToCard } from '../../../shared/model/bind'
import { walkLayers } from '../../../shared/model/normalize'
import { resolveAsset } from '../../../shared/model/assets'
import {
  DEFAULT_IMAGE,
  DEFAULT_PDF,
  DEFAULT_TTS,
  pdfGrid,
  type ExportJob,
  type ExportKind,
  type ExportProfiles,
  type ExportProgress,
  type ExportResult,
  type ExportSet,
  type ImageOptions,
  type PdfOptions,
  type TtsOptions
} from '../../../shared/export'
import { messageFromError, type Message } from '../../../shared/messages'
import { Dialog } from '../editor/dialogs'
import Segmented from '../components/Segmented'
import { useI18n } from '../i18n/context'
import type { MessageKey } from '../i18n/en'

const KIND_KEY = 'exportKind'
const DPIS = [150, 300, 600]

/** Le carte dei set scelti, con i valori della riga applicati al template */
function buildSets(project: LoadedProject, names: string[]): ExportSet[] {
  const ctx = { assets: project.assets, styles: project.file.styles }
  return project.sets
    .filter((s) => !names.length || names.includes(s.name))
    .flatMap((s) => {
      const tpl = project.templates.find((x) => x.name === s.template)
      if (!tpl || !s.data) return []
      const { headers, rows } = s.data
      const cards = rows.map((row, i) => {
        const card = rowToCard(headers, row)
        const bound = bindCard(tpl, card, ctx)
        return {
          n: i + 1,
          amount: card.amount,
          label: bound.label,
          fields: cardFields(tpl, card),
          template: bound.template
        }
      })
      return [{ name: s.name, cards }]
    })
}

export default function ExportDialog({
  project,
  onProfiles,
  onClose
}: {
  project: LoadedProject
  /** Opzioni salvate in gamecreator.json dopo un'esportazione */
  onProfiles(p: ExportProfiles): void
  onClose(): void
}): React.JSX.Element {
  const { t } = useI18n()
  const saved = project.file.export ?? {}
  const [kind, setKindState] = useState<ExportKind>(() => {
    const k = localStorage.getItem(KIND_KEY)
    return k === 'pdf' || k === 'tts' ? k : 'images'
  })
  const setKind = (k: ExportKind): void => {
    localStorage.setItem(KIND_KEY, k)
    setKindState(k)
  }
  const [img, setImg] = useState<ImageOptions>({ ...DEFAULT_IMAGE, ...saved.images })
  const [pdf, setPdf] = useState<PdfOptions>({ ...DEFAULT_PDF, ...saved.pdf })
  const [tts, setTts] = useState<TtsOptions>(() => ({
    ...DEFAULT_TTS,
    nickname: defaultNickname(project),
    ...saved.tts
  }))
  const [defaults, setDefaults] = useState({ export: '', tts: '' })
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)
  const [error, setError] = useState<Message | null>(null)
  const running = progress !== null

  useEffect(() => {
    window.api.defaultExportFolders().then(setDefaults)
    return window.api.onExportProgress(setProgress)
  }, [])

  const options = kind === 'images' ? img : kind === 'pdf' ? pdf : tts
  const setNames = project.sets.map((s) => s.name)
  // nessun set scelto vuol dire tutti; un set rinominato o eliminato si ignora
  const chosen = options.sets.filter((s) => setNames.includes(s))
  const selected = chosen.length ? chosen : setNames
  const patch = (p: Partial<ImageOptions & PdfOptions & TtsOptions>): void => {
    if (kind === 'images') setImg((o) => ({ ...o, ...p }))
    else if (kind === 'pdf') setPdf((o) => ({ ...o, ...p }))
    else setTts((o) => ({ ...o, ...p }))
  }
  const toggleSet = (name: string): void => {
    const next = selected.includes(name) ? selected.filter((s) => s !== name) : [...selected, name]
    patch({ sets: next.length === setNames.length ? [] : next })
  }

  const firstTemplate = useMemo(() => {
    const set = project.sets.find((s) => selected.includes(s.name))
    return project.templates.find((x) => x.name === set?.template) ?? null
  }, [project, selected])
  const fieldNames = useMemo(() => {
    const names = new Set<string>()
    for (const s of project.sets) {
      if (!selected.includes(s.name)) continue
      const tpl = project.templates.find((x) => x.name === s.template)
      if (tpl)
        for (const l of walkLayers([...tpl.front, ...tpl.back]))
          if (l.type === 'text' || l.type === 'value') names.add(l.name)
      for (const h of s.data?.headers ?? [])
        if (h && !h.includes('.') && h !== 'amount') names.add(h)
    }
    return [...names]
  }, [project, selected])

  const run = async (): Promise<void> => {
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: 0 })
    const profiles: ExportProfiles = { ...saved, images: img, pdf, tts }
    try {
      window.api.saveExportProfiles(profiles).catch(() => undefined)
      onProfiles(profiles)
      const sets = buildSets(project, selected)
      const base = { project: project.file.name, sets }
      const job: ExportJob =
        kind === 'images'
          ? { ...base, kind, options: img }
          : kind === 'pdf'
            ? { ...base, kind, options: pdf }
            : { ...base, kind, options: tts }
      const r = await window.api.runExport(job, {
        assets: project.assets,
        styles: project.file.styles ?? {}
      })
      const missing = missingImages(project, sets)
      if (missing.length)
        r.warnings.push({ key: 'export.missingImages', params: { cards: missing.join(', ') } })
      setResult(r)
    } catch (e) {
      setError(messageFromError(e))
    } finally {
      setProgress(null)
    }
  }

  const chooseFolder = async (current: string, key: 'folder' | 'ttsFolder'): Promise<void> => {
    const f = await window.api.chooseExportFolder(current)
    if (f) patch({ [key]: f })
  }

  const num = (v: string, fallback: number): number => {
    const n = parseFloat(v.replace(',', '.'))
    return Number.isFinite(n) ? n : fallback
  }

  const field = (label: MessageKey, control: React.ReactNode, hint?: string): React.JSX.Element => (
    <div className="field">
      <span className="field-label">{t(label)}</span>
      <div className="field-control">{control}</div>
      {hint && <p className="field-note export-note">{hint}</p>}
    </div>
  )
  const check = (
    value: boolean,
    onChange: (v: boolean) => void,
    label: MessageKey
  ): React.JSX.Element => (
    <label className="check">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {t(label)}
    </label>
  )
  const select = <T extends string | number>(
    value: T,
    choices: [T, string][],
    onChange: (v: T) => void
  ): React.JSX.Element => (
    <select
      value={String(value)}
      onChange={(e) => {
        const c = choices.find(([v]) => String(v) === e.target.value)
        if (c) onChange(c[0])
      }}
    >
      {choices.map(([v, label]) => (
        <option key={String(v)} value={String(v)}>
          {label}
        </option>
      ))}
    </select>
  )
  const mm = (
    value: number,
    onChange: (v: number) => void,
    disabled = false
  ): React.JSX.Element => (
    <>
      <input
        className="num"
        type="number"
        step={0.5}
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(num(e.target.value, value))}
      />
      <span className="unit">mm</span>
    </>
  )
  const folderField = (
    value: string,
    placeholder: string,
    key: 'folder' | 'ttsFolder'
  ): React.JSX.Element => (
    <>
      <input
        value={value}
        placeholder={placeholder}
        title={value || placeholder}
        onChange={(e) => patch({ [key]: e.target.value })}
      />
      <button type="button" onClick={() => chooseFolder(value || placeholder, key)}>
        {t('export.choose')}
      </button>
    </>
  )
  const sides: [ImageOptions['sides'], string][] = [
    ['front', t('export.front')],
    ['back', t('export.back')],
    ['both', t('export.bothSides')]
  ]

  let perPage: string | null = null
  if (kind === 'pdf' && firstTemplate) {
    const g = pdfGrid(pdf, firstTemplate)
    perPage =
      g.x0 < 0 || g.y0 < 0
        ? t('export.gridTooBig')
        : t('export.perPage', { cols: g.cols, rows: g.rows, n: g.cols * g.rows })
  }

  return (
    <Dialog title={t('export.title')} onClose={running ? () => undefined : onClose}>
      <div className="export-dialog">
        <Segmented<ExportKind>
          value={kind}
          options={[
            ['images', t('export.images')],
            ['pdf', t('export.pdf')],
            ['tts', t('export.tts')]
          ]}
          onChange={setKind}
        />
        <div className="export-fields">
          {field(
            'export.sets',
            <div className="export-sets">
              {setNames.map((name) => (
                <label key={name} className="check">
                  <input
                    type="checkbox"
                    checked={selected.includes(name)}
                    onChange={() => toggleSet(name)}
                  />
                  {name}
                </label>
              ))}
            </div>
          )}
          {field(
            'export.copies',
            check(options.copies, (copies) => patch({ copies }), 'export.copiesHint')
          )}

          {kind === 'images' && (
            <>
              {field(
                'export.format',
                <>
                  {select(
                    img.format,
                    [
                      ['png', 'PNG'],
                      ['jpg', 'JPG']
                    ],
                    (format) => patch({ format })
                  )}
                  {img.format === 'jpg' && (
                    <>
                      <span className="unit">{t('export.quality')}</span>
                      <input
                        className="num narrow"
                        type="number"
                        min={1}
                        max={100}
                        value={img.quality}
                        onChange={(e) => patch({ quality: num(e.target.value, img.quality) })}
                      />
                    </>
                  )}
                </>
              )}
              {field(
                'export.resolution',
                <>
                  {select<number>(
                    DPIS.includes(img.dpi) ? img.dpi : 0,
                    [
                      ...DPIS.map((d): [number, string] => [d, `${d} DPI`]),
                      [0, t('export.custom')]
                    ],
                    (dpi) => patch({ dpi: dpi || img.dpi + 1 })
                  )}
                  {!DPIS.includes(img.dpi) && (
                    <>
                      <input
                        className="num"
                        type="number"
                        min={30}
                        max={1200}
                        value={img.dpi}
                        onChange={(e) =>
                          patch({ dpi: Math.max(30, Math.min(1200, num(e.target.value, img.dpi))) })
                        }
                      />
                      <span className="unit">DPI</span>
                    </>
                  )}
                </>,
                firstTemplate
                  ? t('export.pixels', {
                      w: Math.round(
                        ((firstTemplate.width + (img.bleed ? 2 * firstTemplate.bleed : 0)) *
                          img.dpi) /
                          25.4
                      ),
                      h: Math.round(
                        ((firstTemplate.height + (img.bleed ? 2 * firstTemplate.bleed : 0)) *
                          img.dpi) /
                          25.4
                      )
                    })
                  : undefined
              )}
              {field(
                'export.bleed',
                check(img.bleed, (bleed) => patch({ bleed }), 'export.bleedInclude')
              )}
              {field(
                'export.sides',
                select(img.sides, sides, (s) => patch({ sides: s }))
              )}
              {img.format === 'png' &&
                !img.bleed &&
                field(
                  'export.background',
                  check(
                    img.transparent,
                    (transparent) => patch({ transparent }),
                    'export.transparent'
                  )
                )}
              {field(
                'export.pattern',
                <input value={img.pattern} onChange={(e) => patch({ pattern: e.target.value })} />,
                t('export.patternHint')
              )}
              {field('export.folder', folderField(img.folder, defaults.export, 'folder'))}
            </>
          )}

          {kind === 'pdf' && (
            <>
              {field(
                'export.page',
                <>
                  {select(
                    pdf.page,
                    [
                      ['A4', 'A4'],
                      ['A3', 'A3'],
                      ['Letter', 'Letter'],
                      ['custom', t('export.custom')]
                    ],
                    (page) => patch({ page })
                  )}
                  {select(
                    pdf.landscape ? 'l' : 'p',
                    [
                      ['p', t('export.portrait')],
                      ['l', t('export.landscape')]
                    ],
                    (v) => patch({ landscape: v === 'l' })
                  )}
                </>
              )}
              {pdf.page === 'custom' &&
                field(
                  'export.pageSize',
                  <>
                    {mm(pdf.pageWidth, (pageWidth) => patch({ pageWidth }))}
                    <span className="unit">×</span>
                    {mm(pdf.pageHeight, (pageHeight) => patch({ pageHeight }))}
                  </>
                )}
              {field(
                'export.margin',
                mm(pdf.margin, (margin) => patch({ margin }))
              )}
              {field(
                'export.bleed',
                check(pdf.bleed, (bleed) => patch({ bleed }), 'export.bleedTouch')
              )}
              {field(
                'export.spacing',
                mm(pdf.spacing, (spacing) => patch({ spacing }), pdf.bleed)
              )}
              {field(
                'export.layout',
                <>
                  {select(
                    pdf.layout,
                    [
                      ['auto', t('export.layoutAuto')],
                      ['fixed', t('export.layoutFixed')]
                    ],
                    (layout) => patch({ layout })
                  )}
                  {pdf.layout === 'fixed' && (
                    <>
                      <input
                        className="num narrow"
                        type="number"
                        min={1}
                        value={pdf.cols}
                        onChange={(e) =>
                          patch({ cols: Math.max(1, Math.round(num(e.target.value, pdf.cols))) })
                        }
                      />
                      <span className="unit">×</span>
                      <input
                        className="num narrow"
                        type="number"
                        min={1}
                        value={pdf.rows}
                        onChange={(e) =>
                          patch({ rows: Math.max(1, Math.round(num(e.target.value, pdf.rows))) })
                        }
                      />
                    </>
                  )}
                </>,
                perPage ?? undefined
              )}
              {field(
                'export.marks',
                <>
                  {select(
                    pdf.marks,
                    [
                      ['none', t('export.marksNone')],
                      ['corners', t('export.marksCorners')],
                      ['lines', t('export.marksLines')]
                    ],
                    (marks) => patch({ marks })
                  )}
                  {pdf.marks !== 'none' && (
                    <input
                      type="color"
                      value={pdf.markColor}
                      title={t('export.markColor')}
                      onChange={(e) => patch({ markColor: e.target.value })}
                    />
                  )}
                </>
              )}
              {pdf.marks !== 'none' && (
                <>
                  {pdf.marks === 'corners' &&
                    field(
                      'export.markLength',
                      mm(pdf.markLength, (markLength) => patch({ markLength }))
                    )}
                  {field(
                    'export.markWidth',
                    <>
                      {mm(pdf.markWidth, (markWidth) => patch({ markWidth }))}
                      {check(
                        pdf.marksOver,
                        (marksOver) => patch({ marksOver }),
                        'export.marksOver'
                      )}
                    </>
                  )}
                </>
              )}
              {field(
                'export.duplex',
                select(
                  pdf.duplex,
                  [
                    ['none', t('export.duplexNone')],
                    ['long', t('export.duplexLong')],
                    ['short', t('export.duplexShort')]
                  ],
                  (duplex) => patch({ duplex })
                )
              )}
              {pdf.duplex === 'none'
                ? field(
                    'export.sides',
                    select(pdf.sides, sides, (s) => patch({ sides: s }))
                  )
                : field(
                    'export.offset',
                    <>
                      <span className="unit">x</span>
                      {mm(pdf.offsetX, (offsetX) => patch({ offsetX }))}
                      <span className="unit">y</span>
                      {mm(pdf.offsetY, (offsetY) => patch({ offsetY }))}
                    </>,
                    t('export.offsetHint')
                  )}
              {field(
                'export.files',
                select(
                  pdf.split,
                  [
                    ['single', t('export.splitSingle')],
                    ['set', t('export.splitSet')],
                    ['side', t('export.splitSide')]
                  ],
                  (split) => patch({ split })
                )
              )}
              {field('export.folder', folderField(pdf.folder, defaults.export, 'folder'))}
            </>
          )}

          {kind === 'tts' && (
            <>
              {field(
                'export.grid',
                <>
                  {select(
                    tts.grid,
                    [
                      ['auto', t('export.gridAuto')],
                      ['fixed', t('export.layoutFixed')]
                    ],
                    (grid) => patch({ grid })
                  )}
                  {tts.grid === 'fixed' && (
                    <>
                      <input
                        className="num narrow"
                        type="number"
                        min={2}
                        max={10}
                        value={tts.cols}
                        onChange={(e) =>
                          patch({
                            cols: Math.max(
                              2,
                              Math.min(10, Math.round(num(e.target.value, tts.cols)))
                            )
                          })
                        }
                      />
                      <span className="unit">×</span>
                      <input
                        className="num narrow"
                        type="number"
                        min={2}
                        max={7}
                        value={tts.rows}
                        onChange={(e) =>
                          patch({
                            rows: Math.max(
                              2,
                              Math.min(7, Math.round(num(e.target.value, tts.rows)))
                            )
                          })
                        }
                      />
                    </>
                  )}
                </>,
                t('export.gridHint')
              )}
              {field(
                'export.maxSize',
                select<number>(
                  tts.maxSize,
                  [
                    [4096, '4096 px'],
                    [8192, '8192 px']
                  ],
                  (v) => patch({ maxSize: v === 8192 ? 8192 : 4096 })
                )
              )}
              {field(
                'export.ttsBack',
                select(
                  tts.back,
                  [
                    ['auto', t('export.backAuto')],
                    ['single', t('export.backSingle')],
                    ['sheet', t('export.backSheet')]
                  ],
                  (back) => patch({ back })
                )
              )}
              {field(
                'export.destination',
                select(
                  tts.destination,
                  [
                    ['project', t('export.destProject')],
                    ['tts', t('export.destTts')],
                    ['both', t('export.destBoth')]
                  ],
                  (destination) => patch({ destination })
                )
              )}
              {tts.destination !== 'project' &&
                field('export.ttsFolder', folderField(tts.ttsFolder, defaults.tts, 'ttsFolder'))}
              {field(
                'export.nickname',
                select(
                  tts.nickname,
                  [['', t('export.noField')], ...fieldNames.map((f): [string, string] => [f, f])],
                  (nickname) => patch({ nickname })
                )
              )}
              {field(
                'export.description',
                select(
                  tts.description,
                  [['', t('export.noField')], ...fieldNames.map((f): [string, string] => [f, f])],
                  (description) => patch({ description })
                )
              )}
            </>
          )}
        </div>

        {error && <p className="field-error">{t(error)}</p>}
        {result && (
          <div className="export-result">
            <p>
              {result.cancelled
                ? t('export.cancelled', { n: result.files })
                : t('export.done', { n: result.files })}
            </p>
            {result.warnings.map((w, i) => (
              <p key={i} className="field-error">
                {t(w)}
              </p>
            ))}
            {result.folders.map((f) => (
              <button
                key={f}
                type="button"
                className="link"
                onClick={() => window.api.showFolder(f)}
              >
                {t('export.openFolder', { folder: f })}
              </button>
            ))}
          </div>
        )}
        <div className="dialog-buttons">
          {running && (
            <span className="muted export-progress">
              {progress.total
                ? t('export.progress', { done: progress.done, total: progress.total })
                : t('export.preparing')}
            </span>
          )}
          {running ? (
            <button type="button" onClick={() => window.api.cancelExport()}>
              {t('export.cancel')}
            </button>
          ) : (
            <button type="button" onClick={onClose}>
              {t('export.close')}
            </button>
          )}
          <button
            type="button"
            className="primary"
            disabled={running || !selected.length}
            onClick={run}
          >
            {t('export.run')}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

/** Carte con immagini che mancano in assets/: nell'esportazione restano i segnaposto */
function missingImages(project: LoadedProject, sets: ExportSet[]): string[] {
  const out: string[] = []
  for (const set of sets)
    for (const c of set.cards) {
      const layers = walkLayers([...c.template.front, ...c.template.back])
      const missing = layers.some(
        (l) =>
          l.type === 'image' &&
          l.visible &&
          l.missing !== 'hide' &&
          l.src.trim() !== '' &&
          !resolveAsset(l.src, project.assets).ok
      )
      if (missing) out.push(`${set.name} ${c.n}${c.label ? ` (${c.label})` : ''}`)
    }
  return out
}

/** Nickname di base: il campo che dà il nome alle carte, o il primo testo del template */
function defaultNickname(project: LoadedProject): string {
  const tpl = project.templates.find((x) => x.name === project.sets[0]?.template)
  if (!tpl) return ''
  if (tpl.labelField) return tpl.labelField
  return walkLayers(tpl.front).find((l) => l.type === 'text')?.name ?? ''
}
