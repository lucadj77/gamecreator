import { app } from 'electron'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import Papa from 'papaparse'
import { messageFromError } from '../shared/messages'
import type { LoadedProject } from '../shared/project'
import {
  CliError,
  messageText,
  parseArgs,
  parseCardList,
  parseRowsFile,
  type Parsed
} from './cliParse'
import { bindRow, rowToCard } from '../shared/model/bind'
import { systemOfSet } from '../shared/model/system'
import { isGenericFont } from '../shared/model/fonts'
import { resolveAsset } from '../shared/model/assets'
import { walkLayers } from '../shared/model/normalize'
import type { Layer, Template } from '../shared/model/template'
import {
  DEFAULT_IMAGE,
  DEFAULT_PDF,
  DEFAULT_TTS,
  type ExportJob,
  type ExportSet,
  type SidesChoice
} from '../shared/export'
import { buildSets } from '../shared/exportJob'
import { runExport } from './export/run'
import { loadProject } from './project/load'
import { createProject } from './project/create'
import { saveData } from './project/save'
import { setProjectFolder } from './protocol'
import { systemFonts } from './library/systemFonts'
import { createBackup } from './project/backup'
import { beginAgent, endAgent, readAppState, UnsavedChangesError } from './project/agentLock'

// Il comando naibi: lo stesso programma dell'app, avviato con --cli, senza finestre. Serve a chi
// lavora su un progetto da terminale, in particolare a un'IA: legge, controlla, scrive i dati e
// disegna le carte. Vedi docs/cli.md. Testi in inglese, come gli identificatori dei file.

const HELP = `Usage: naibi <command> [options]

Commands:
  info <project>                       Summary: sets, templates, variables, styles, assets
  check <project> [--set S]            Problems on every card (missing images, fonts, markup,
                                       formulas); exit code 1 if there are any
  template <project> <name>            Layers of a template, with their data source
  rows <project> <set> [--csv|--json]  Rows of a set's sheet (default: tab-separated)
  set-rows <project> <set> <file>      Replace a set's rows with a .csv or .json file
                                       (a backup of the project is made first)
  render <project> [--set S] [--card N[,M,A-B]] [--side front|back|both]
         [--dpi 150] [--out folder]    Draw cards as PNG files (default folder: export/naibi-render)
  export <project> --profile NAME      Run a named export profile saved in the project
  new <name> <parent folder>           Create an empty project
  begin <project> [--note TEXT]        Start working: fails (exit code 3) if the Naibi app has
                                       unsaved changes in the project, otherwise the app locks
                                       itself until 'end'
  end <project>                        Finish working: the app unlocks and reloads the project
  help                                 This text

<project> is the project folder (the one with naibi.json).
Add --json to info, check and template for machine-readable output.`

const print = (s = ''): void => {
  process.stdout.write(s + '\n')
}

async function open(folder: string | undefined): Promise<LoadedProject> {
  if (!folder) throw new CliError('missing project folder')
  const project = await loadProject(resolve(folder))
  setProjectFolder(project.folder)
  return project
}

function findSet(project: LoadedProject, name: string | undefined): LoadedProject['sets'][number] {
  if (!name) throw new CliError('missing set name')
  const set = project.sets.find((s) => s.name === name)
  if (!set) {
    const names = project.sets.map((s) => s.name).join(', ')
    throw new CliError(`no set "${name}" (sets: ${names || 'none'})`)
  }
  return set
}

function cardCount(rows: string[][], headers: string[]): number {
  return rows.reduce((sum, r) => sum + rowToCard(headers, r).amount, 0)
}

function layerSummary(l: Layer): string {
  const src = l.source
  const from =
    src.kind === 'fixed'
      ? 'fixed'
      : src.kind === 'formula'
        ? `formula ${src.expr}`
        : `column ${src.column || l.name}`
  const main =
    l.type === 'text'
      ? ` text=${JSON.stringify(l.text)}`
      : l.type === 'image'
        ? ` src=${JSON.stringify(l.src)}`
        : l.type === 'shape'
          ? ` ${l.shape} fill=${l.fill ?? 'none'}`
          : l.type === 'value'
            ? ` value=${JSON.stringify(l.value)}`
            : ''
  const box = l.type === 'value' ? '' : ` at ${l.x},${l.y} size ${l.w}×${l.h} mm`
  return `${l.name} (${l.type})${box}${main} · value from ${from}${l.visible ? '' : ' · hidden'}`
}

function templateOutline(t: Template): string[] {
  const out = [
    `${t.name}: ${t.width}×${t.height} mm, bleed ${t.bleed} mm, corner radius ${t.cornerRadius} mm${t.shape ? `, shape ${t.shape}` : ''}`
  ]
  if (t.extends)
    out.push(
      `extends ${t.extends}; changes: ${JSON.stringify({ ...t.changes, added: t.changes?.added?.map((a) => a.layer.name) })}`
    )
  const walk = (layers: Layer[], depth: number): void => {
    for (const l of layers) {
      out.push(`${'  '.repeat(depth)}- ${layerSummary(l)}`)
      if (l.type === 'group') walk(l.children, depth + 1)
    }
  }
  for (const side of ['front', 'back'] as const) {
    out.push(`${side} (top layer first):`)
    if (!t[side].length) out.push('  (empty)')
    walk(t[side], 1)
  }
  return out
}

async function info(p: Parsed): Promise<number> {
  const project = await open(p.positional[0])
  const f = project.file
  const data = {
    name: f.name,
    folder: project.folder,
    dataFile: f.dataFile,
    sets: project.sets.map((s) => ({
      name: s.name,
      template: s.template,
      sheet: s.sheet ?? s.name,
      rows: s.data?.rows.length ?? 0,
      cards: s.data ? cardCount(s.data.rows, s.data.headers) : 0,
      columns: s.data?.headers ?? []
    })),
    templates: project.templates.map((t) => ({
      name: t.name,
      ...(t.extends ? { extends: t.extends } : {}),
      width: t.width,
      height: t.height,
      front: walkLayers(t.front).map((l) => `${l.name}:${l.type}`),
      back: walkLayers(t.back).map((l) => `${l.name}:${l.type}`)
    })),
    variables: Object.entries(f.variables ?? {}).map(([name, v]) => ({ name, ...v })),
    styles: f.styles ?? {},
    exportProfiles: (f.export?.named ?? []).map((n) => `${n.name} (${n.kind})`),
    assets: project.assets,
    fonts: [...new Set(project.fonts.map((x) => x.family))],
    unusedSheets: project.unusedSheets,
    warnings: project.warnings.map(messageText)
  }
  if (p.flags.json) {
    print(JSON.stringify(data, null, 2))
    return 0
  }
  print(`Project: ${data.name}  (${data.folder})`)
  print(`Data file: ${data.dataFile}`)
  print('Sets:')
  for (const s of data.sets)
    print(
      `  ${s.name}: template ${s.template}, sheet ${s.sheet}, ${s.rows} rows, ${s.cards} cards; columns: ${s.columns.join(', ') || '(none)'}`
    )
  print('Templates:')
  for (const t of data.templates)
    print(
      `  ${t.name}${t.extends ? ` (extends ${t.extends})` : ''}: ${t.width}×${t.height} mm; front: ${t.front.join(', ') || '(empty)'}; back: ${t.back.join(', ') || '(empty)'}`
    )
  print('Variables:')
  for (const v of data.variables) {
    const { name, ...rest } = v
    print(`  {${name}} ${JSON.stringify(rest)}`)
  }
  print('Styles:')
  for (const [k, v] of Object.entries(data.styles)) print(`  .${k}: ${v}`)
  if (data.exportProfiles.length) print(`Export profiles: ${data.exportProfiles.join(', ')}`)
  print(
    `Assets: ${data.assets.length} files (${project.assets.filter((a) => /\.(svg|png|jpe?g|webp)$/i.test(a)).length} images); fonts: ${data.fonts.join(', ') || 'none'}`
  )
  if (data.unusedSheets.length) print(`Sheets not linked to a set: ${data.unusedSheets.join(', ')}`)
  for (const w of data.warnings) print(`Warning: ${w}`)
  return 0
}

async function fontCheck(project: LoadedProject): Promise<(family: string) => boolean> {
  const own = new Set(['nunito', ...project.fonts.map((f) => f.family.toLowerCase())])
  const installed = new Set(
    (await systemFonts().catch(() => [])).map((f) => f.family.toLowerCase())
  )
  return (family) => {
    const f = family.trim().toLowerCase()
    return !f || isGenericFont(f) || own.has(f) || installed.has(f)
  }
}

async function check(p: Parsed): Promise<number> {
  const project = await open(p.positional[0])
  const only = typeof p.flags.set === 'string' ? p.flags.set : null
  if (only) findSet(project, only)
  const ctx = {
    assets: project.assets,
    styles: project.file.styles,
    variables: project.file.variables,
    hasFont: await fontCheck(project)
  }
  const report: { set: string; card: number; label: string; problems: string[] }[] = []
  const general = project.warnings.map(messageText)
  for (const s of project.sets) {
    if (only && s.name !== only) continue
    const tpl = project.templates.find((t) => t.name === s.template)
    if (!tpl || !s.data) continue
    const info = systemOfSet(project.file.name, s)
    s.data.rows.forEach((row, i) => {
      const bound = bindRow(s.data!.headers, row, tpl, project.templates, {
        ...ctx,
        system: { ...info, number: i + 1 }
      })
      const problems = bound.problems.map(messageText)
      // le immagini dei livelli: l'app le segnala solo all'esportazione
      for (const side of ['front', 'back'] as const)
        for (const l of walkLayers(bound.template[side]))
          if (l.type === 'image' && l.visible && l.missing !== 'hide' && l.src.trim()) {
            const r = resolveAsset(l.src, project.assets)
            if (!r.ok)
              problems.push(
                `Layer ${l.name} (${side}): image "${l.src.trim()}" ${r.reason === 'ambiguous' ? `is ambiguous (${r.candidates.join(', ')})` : 'not found in assets'}`
              )
          }
      if (problems.length)
        report.push({
          set: s.name,
          card: i + 1,
          label: bound.label,
          problems: [...new Set(problems)]
        })
    })
  }
  const total = general.length + report.length
  if (p.flags.json) print(JSON.stringify({ warnings: general, cards: report }, null, 2))
  else {
    for (const w of general) print(`Warning: ${w}`)
    for (const r of report)
      for (const pr of r.problems) print(`${r.set} #${r.card} (${r.label}): ${pr}`)
    print(total ? `${report.length} cards with problems` : 'No problems found')
  }
  return total ? 1 : 0
}

async function template(p: Parsed): Promise<number> {
  const project = await open(p.positional[0])
  const name = p.positional[1]
  const t = project.templates.find((x) => x.name === name)
  if (!t) {
    const names = project.templates.map((x) => x.name).join(', ')
    throw new CliError(`no template "${name ?? ''}" (templates: ${names || 'none'})`)
  }
  if (p.flags.json) print(JSON.stringify(t, null, 2))
  else templateOutline(t).forEach((l) => print(l))
  return 0
}

async function rows(p: Parsed): Promise<number> {
  const project = await open(p.positional[0])
  const set = findSet(project, p.positional[1])
  const sheet = set.data ?? { name: set.sheet ?? set.name, headers: [], rows: [] }
  if (p.flags.json)
    print(
      JSON.stringify(
        sheet.rows.map((r) => Object.fromEntries(sheet.headers.map((h, i) => [h, r[i] ?? '']))),
        null,
        2
      )
    )
  else if (p.flags.csv) print(Papa.unparse([sheet.headers, ...sheet.rows]))
  else {
    print(['#', ...sheet.headers].join('\t'))
    sheet.rows.forEach((r, i) =>
      print([i + 1, ...r.map((c) => c.replace(/\n/g, '\\n'))].join('\t'))
    )
  }
  return 0
}

const UNSAVED =
  'the Naibi app has unsaved changes in this project: ask the user to save (or reload) in the app, then try again'

async function setRows(p: Parsed): Promise<number> {
  const project = await open(p.positional[0])
  if ((await readAppState(project.folder))?.dirty) throw new CliError(UNSAVED)
  const set = findSet(project, p.positional[1])
  const file = p.positional[2]
  if (!file) throw new CliError('missing .csv or .json file')
  const { headers, rows: data } = parseRowsFile(
    await readFile(resolve(file), 'utf8'),
    file.toLowerCase().endsWith('.json')
  )
  if (!headers.length) throw new CliError('the file has no columns')
  const backup = await createBackup(
    project.folder,
    project.file.name,
    join(app.getPath('documents'), 'Naibi', 'Backup', project.file.name || 'project')
  ).catch(() => null)
  await saveData(project.folder, {
    sheets: [{ name: set.sheet ?? set.name, headers, rows: data }]
  })
  print(`${set.name}: wrote ${data.length} rows, columns ${headers.join(', ')}`)
  if (backup) print(`Backup of the previous state: ${backup.file}`)
  return 0
}

function selectCards(sets: ExportSet[], spec: string | true | undefined): ExportSet[] {
  if (typeof spec !== 'string') return sets
  const wanted = new Set(parseCardList(spec))
  return sets.map((s) => ({ ...s, cards: s.cards.filter((c) => wanted.has(c.n)) }))
}

async function exportJob(project: LoadedProject, job: ExportJob): Promise<number> {
  const r = await runExport(job, {
    projectFolder: project.folder,
    platform: process.platform,
    home: app.getPath('home'),
    documents: app.getPath('documents'),
    context: {
      assets: project.assets,
      fonts: project.fonts,
      styles: project.file.styles ?? {},
      variables: project.file.variables ?? {}
    },
    onProgress: () => undefined,
    isCancelled: () => false
  })
  print(`${r.files} files in ${r.folders.join(', ') || '(nothing exported)'}`)
  for (const w of r.warnings) print(`Warning: ${messageText(w)}`)
  return 0
}

async function render(p: Parsed): Promise<number> {
  const project = await open(p.positional[0])
  const setName = typeof p.flags.set === 'string' ? p.flags.set : null
  if (setName) findSet(project, setName)
  const sets = selectCards(buildSets(project, setName ? [setName] : []), p.flags.card)
  if (!sets.some((s) => s.cards.length)) throw new CliError('no cards to draw')
  const side = (typeof p.flags.side === 'string' ? p.flags.side : 'front') as SidesChoice
  if (!['front', 'back', 'both'].includes(side)) throw new CliError('--side: front, back or both')
  const dpi = Number(p.flags.dpi ?? 150)
  if (!(dpi >= 30 && dpi <= 1200)) throw new CliError('--dpi: a number between 30 and 1200')
  const out =
    typeof p.flags.out === 'string'
      ? resolve(p.flags.out)
      : join(project.folder, 'export', 'naibi-render')
  return exportJob(project, {
    kind: 'images',
    project: project.file.name,
    sets,
    options: {
      ...DEFAULT_IMAGE,
      folder: out,
      dpi,
      sides: side,
      pattern: side === 'both' ? '%set/%n_%side' : '%set/%n'
    }
  })
}

async function exportProfile(p: Parsed): Promise<number> {
  const project = await open(p.positional[0])
  const name = p.flags.profile
  const named = project.file.export?.named ?? []
  const profile = named.find((n) => n.name === name)
  if (!profile)
    throw new CliError(
      `no export profile "${typeof name === 'string' ? name : ''}" (profiles: ${named.map((n) => n.name).join(', ') || 'none'})`
    )
  const sets = buildSets(project, profile.options.sets ?? [])
  const base = { project: project.file.name, sets }
  const job: ExportJob =
    profile.kind === 'images'
      ? { ...base, kind: 'images', options: { ...DEFAULT_IMAGE, ...profile.options } }
      : profile.kind === 'pdf'
        ? { ...base, kind: 'pdf', options: { ...DEFAULT_PDF, ...profile.options } }
        : {
            ...base,
            kind: 'tts',
            options: { ...DEFAULT_TTS, nickname: project.file.name, ...profile.options }
          }
  return exportJob(project, job)
}

async function create(p: Parsed): Promise<number> {
  const [name, parent] = p.positional
  if (!name || !parent) throw new CliError('usage: naibi new <name> <parent folder>')
  const folder = await createProject(name, resolve(parent))
  print(`Created ${folder}`)
  return 0
}

async function begin(p: Parsed): Promise<number> {
  const project = await open(p.positional[0])
  const note = typeof p.flags.note === 'string' ? p.flags.note : undefined
  try {
    await beginAgent(project.folder, note)
  } catch (e) {
    if (!(e instanceof UnsavedChangesError)) throw e
    process.stderr.write(`naibi: ${UNSAVED}\n`)
    return 3
  }
  const app = await readAppState(project.folder)
  print(
    app
      ? 'The Naibi app is now locked on this project. Run "end" when you have finished.'
      : 'Ready. Run "end" when you have finished.'
  )
  return 0
}

async function end(p: Parsed): Promise<number> {
  const project = await open(p.positional[0])
  await endAgent(project.folder)
  print('Done: the Naibi app, if open, reloads the project.')
  return 0
}

const COMMANDS: Record<string, (p: Parsed) => Promise<number>> = {
  info,
  check,
  template,
  rows,
  'set-rows': setRows,
  render,
  export: exportProfile,
  new: create,
  begin,
  end
}

/** Esegue il comando e restituisce il codice di uscita */
export async function runCli(args: string[]): Promise<number> {
  const [command, ...rest] = args
  if (!command || command === 'help' || command === '--help') {
    print(HELP)
    return command ? 0 : 2
  }
  const fn = COMMANDS[command]
  if (!fn) {
    process.stderr.write(`naibi: unknown command "${command}"\n\n${HELP}\n`)
    return 2
  }
  try {
    return await fn(parseArgs(rest))
  } catch (e) {
    const m = messageFromError(e)
    const text = m.key === 'error.generic' ? String(m.params?.text ?? '') : messageText(m)
    process.stderr.write(`naibi: ${text}\n`)
    return 2
  }
}
