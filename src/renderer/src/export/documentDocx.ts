import JSZip from 'jszip'
import type { DocExportFile } from '../../../shared/api'
import type { ProjectFont } from '../../../shared/project'
import type { HAlign } from '../../../shared/model/template'
import { parseInline, resolveStyles, type Inline } from '../../../shared/model/markup'
import { resolveAsset } from '../../../shared/model/assets'
import { imageVariable, palette, resolveColor, resolveFont } from '../../../shared/model/variables'
import {
  DOC_PAGES,
  documentText,
  figureAlign,
  isCardSource,
  parseDocument,
  type DocSettings,
  type DocumentContext
} from '../../../shared/model/document'
import { assetUrl } from '../render/assets'
import { cardPng } from './documentExport'
import { dataUri } from './toSvg'

// Esportazione di un documento in Word (.docx), da modificare o da mandare a chi usa Word: testo
// con titoli, elenchi, tabelle e citazioni come stili di Word, le carte, gli schemi e le immagini
// come PNG a 300 punti per pollice. Formato pagina, margini e caratteri vengono dalle impostazioni
// del documento. Si ricava dall'anteprima già disegnata, come il Markdown.

const DPI = 300
/** Unità di Word: twip (1/20 di punto) ed EMU (per le immagini) per millimetro */
const TWIP = 1440 / 25.4
const EMU = 36000
const PX_MM = 25.4 / 96
/** Carattere quando il documento non ne sceglie uno */
const DEFAULT_FONT = 'Arial'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Un colore CSS (anche con nome o trasparenza) come RRGGBB, o undefined */
function hex(color: string | undefined): string | undefined {
  if (!color) return undefined
  const c = document.createElement('canvas').getContext('2d')!
  c.fillStyle = '#000000'
  c.fillStyle = color
  const v = String(c.fillStyle)
  if (v.startsWith('#')) return v.slice(1).toUpperCase()
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v)
  return m
    ? [m[1], m[2], m[3]]
        .map((n) => Number(n).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    : undefined
}

interface Run {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  color?: string
  /** Corpo in punti */
  size?: number
  font?: string
  script?: 'sup' | 'sub'
  smallCaps?: boolean
  upper?: boolean
  lower?: boolean
}

function runProps(r: Run): string {
  const p: string[] = []
  if (r.font)
    p.push(`<w:rFonts w:ascii="${esc(r.font)}" w:hAnsi="${esc(r.font)}" w:cs="${esc(r.font)}"/>`)
  if (r.bold) p.push('<w:b/>')
  if (r.italic) p.push('<w:i/>')
  if (r.smallCaps) p.push('<w:smallCaps/>')
  if (r.strike) p.push('<w:strike/>')
  if (r.color) p.push(`<w:color w:val="${r.color}"/>`)
  if (r.size) p.push(`<w:sz w:val="${Math.round(r.size * 2)}"/>`)
  if (r.underline) p.push('<w:u w:val="single"/>')
  if (r.script) p.push(`<w:vertAlign w:val="${r.script === 'sup' ? 'superscript' : 'subscript'}"/>`)
  return p.length ? `<w:rPr>${p.join('')}</w:rPr>` : ''
}

const textRun = (text: string, r: Run): string =>
  `<w:r>${runProps(r)}<w:t xml:space="preserve">${esc(r.upper ? text.toUpperCase() : r.lower ? text.toLowerCase() : text)}</w:t></w:r>`

interface Media {
  id: string
  file: string
  data: Uint8Array
}

/** Il file .docx del documento */
export async function documentDocx(
  page: HTMLElement,
  name: string,
  text: string,
  ctx: DocumentContext,
  settings: DocSettings,
  fonts: ProjectFont[]
): Promise<DocExportFile[]> {
  const pal = palette(ctx.variables)
  const styles = ctx.styles ?? {}
  const media: Media[] = []
  let drawings = 0
  const baseSize = settings.size

  /** Un'immagine nel testo o da sola, larga w e alta h millimetri */
  const picture = (data: Uint8Array, w: number, h: number): string => {
    const id = `rIdImg${media.length + 1}`
    const file = `image${media.length + 1}.png`
    media.push({ id, file, data })
    const n = ++drawings
    const cx = Math.max(1, Math.round(w * EMU))
    const cy = Math.max(1, Math.round(h * EMU))
    return (
      `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Picture ${n}"/>` +
      `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
      `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:nvPicPr><pic:cNvPr id="${n}" name="${file}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
      `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>` +
      `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
    )
  }

  /** Un'icona nel testo, alta quanto la riga: con la tinta della variabile, se ne ha una */
  const icon = async (refName: string, size: number, tintOf?: string | null): Promise<string> => {
    const v = imageVariable(refName, ctx.variables)
    const r = resolveAsset(v ? v.src : refName, ctx.assets ?? [])
    if (!r.ok) return ''
    const img = await loadImage(assetUrl(r.path))
    if (!img) return ''
    const h = size * (25.4 / 72) * (v?.scale ?? 1)
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1
    const w = h * ratio
    const tint = tintOf !== undefined ? tintOf : v?.tint
    const data = await raster(img, w, h, tint ? resolveColor(tint, pal) : undefined)
    return picture(data, w, h)
  }

  const runs = async (list: Inline[], base: Run): Promise<string> => {
    let out = ''
    for (const n of list) {
      if (n.t === 'text') out += textRun(n.text, base)
      else if (n.t === 'br') out += '<w:r><w:br/></w:r>'
      else if (n.t === 'ref') {
        const one = await icon(n.name, base.size ?? baseSize, n.image?.tint)
        out += one ? one.repeat(n.count) : textRun(n.raw, base)
      } else {
        const a = resolveStyles(n.attrs, styles)
        const r: Run = { ...base }
        if (a.weight !== undefined) r.bold = a.weight >= 600
        if (a.italic !== undefined) r.italic = a.italic
        if (a.underline !== undefined) r.underline = a.underline
        if (a.strike !== undefined) r.strike = a.strike
        if (a.color) r.color = hex(resolveColor(a.color, pal)) ?? r.color
        if (a.font) r.font = resolveFont(a.font, ctx.variables)
        if (a.script) r.script = a.script
        if (a.transform === 'smallcaps') r.smallCaps = true
        if (a.transform === 'upper') r.upper = true
        if (a.transform === 'lower') r.lower = true
        if (a.size) {
          const cur = base.size ?? baseSize
          const s = a.size.trim()
          r.size = s.endsWith('%')
            ? (cur * parseFloat(s)) / 100
            : /^[+-]/.test(s)
              ? cur + parseFloat(s)
              : parseFloat(s) || cur
        }
        out += await runs(n.children, r)
      }
    }
    return out
  }
  const inline = (s: string, base: Run = {}): Promise<string> =>
    runs(parseInline(documentText(s, ctx)).children, base)

  const para = (content: string, props = ''): string =>
    `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${content}</w:p>`
  const jc = (a: HAlign | null | undefined): string =>
    a === 'center' ? '<w:jc w:val="center"/>' : a === 'right' ? '<w:jc w:val="right"/>' : ''

  const [pageW, pageH] = DOC_PAGES[settings.page]
  const textW = (pageW - 2 * settings.margin) * TWIP
  const body: string[] = []
  /** Elenchi numerati: ognuno riparte dal suo primo numero */
  const numbered: number[] = []

  /** Una carta o un disegno della pagina in PNG, alla sua misura */
  const svgPicture = async (svg: SVGSVGElement): Promise<string> => {
    const w = Number(svg.getAttribute('width')) * PX_MM
    const h = Number(svg.getAttribute('height')) * PX_MM
    return picture(await cardPng(svg, fonts), w, h)
  }
  const figureOf = (from: number): Element | null =>
    page.querySelector(`figure[data-from="${from}"]`)

  for (const b of parseDocument(text)) {
    switch (b.kind) {
      case 'heading':
        body.push(para(await inline(b.text), `<w:pStyle w:val="Heading${b.level}"/>`))
        break
      case 'paragraph':
        body.push(para(await inline(b.text)))
        break
      case 'quote':
        body.push(para(await inline(b.text), '<w:pStyle w:val="Quote"/>'))
        break
      case 'rule':
        body.push(
          para(
            '',
            '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C8C8C2"/></w:pBdr>'
          )
        )
        break
      case 'code':
        body.push(
          para(
            b.text
              .split('\n')
              .map((l, i) => (i ? '<w:r><w:br/></w:r>' : '') + textRun(l, {}))
              .join(''),
            '<w:pStyle w:val="Code"/>'
          )
        )
        break
      case 'list': {
        let num = 0
        const first = b.items.find((it) => it.ordered)
        if (first) {
          numbered.push(first.number ?? 1)
          num = numbered.length + 1
        }
        for (const it of b.items)
          body.push(
            para(
              await inline(it.text),
              `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${Math.min(it.depth, 3)}"/>` +
                `<w:numId w:val="${it.ordered ? num : 1}"/></w:numPr>`
            )
          )
        break
      }
      case 'table': {
        const cols = b.header.length || Math.max(1, ...b.rows.map((r) => r.length))
        const colW = Math.floor(textW / Math.max(1, cols))
        const cell = async (s: string, k: number, head: boolean): Promise<string> =>
          `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/>${
            head ? '<w:shd w:val="clear" w:color="auto" w:fill="F3F3F0"/>' : ''
          }</w:tcPr>${para(await inline(s, head ? { bold: true } : {}), `<w:spacing w:after="0" w:line="264" w:lineRule="auto"/>${jc(b.align[k])}`)}</w:tc>`
        const row = async (cells: string[], head: boolean): Promise<string> =>
          `<w:tr>${head ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${(
            await Promise.all(Array.from({ length: cols }, (_, k) => cell(cells[k] ?? '', k, head)))
          ).join('')}</w:tr>`
        const border = (side: string): string =>
          `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="C8C8C2"/>`
        body.push(
          `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${[
            'top',
            'left',
            'bottom',
            'right',
            'insideH',
            'insideV'
          ]
            .map(border)
            .join('')}</w:tblBorders><w:tblCellMar><w:left w:w="85" w:type="dxa"/>` +
            `<w:right w:w="85" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${`<w:gridCol w:w="${colW}"/>`.repeat(cols)}</w:tblGrid>${b.header.length ? await row(b.header, true) : ''}${(
              await Promise.all(b.rows.map((r) => row(r, false)))
            ).join('')}</w:tbl>`,
          // Word vuole un paragrafo dopo una tabella, che fa anche da spazio
          para('', '<w:spacing w:after="0"/>')
        )
        break
      }
      case 'anatomy':
      case 'setup': {
        const svg = figureOf(b.from)?.querySelector<SVGSVGElement>('svg[xmlns]')
        if (svg)
          body.push(
            para(
              await svgPicture(svg),
              '<w:spacing w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>'
            )
          )
        break
      }
      case 'figure': {
        const jc = `<w:jc w:val="${figureAlign(b.images)}"/>`
        const pics: { run: string; alt: string }[] = []
        for (const img of b.images) {
          const fig = figureOf(img.from)
          let run = ''
          if (isCardSource(img.src)) {
            const svg = fig?.querySelector<SVGSVGElement>('svg[xmlns]')
            if (svg) run = await svgPicture(svg)
          } else {
            const el = fig?.querySelector('img')
            if (el?.complete && el.naturalWidth) {
              const r = el.getBoundingClientRect()
              const w = r.width * PX_MM
              const h = r.height * PX_MM
              const copy = await loadImage(el.src)
              if (copy) run = picture(await raster(copy, w, h), w, h)
            }
          }
          if (run) pics.push({ run, alt: img.alt })
        }
        if (!pics.length) break
        if (pics.length === 1) {
          body.push(
            para(
              pics[0].run,
              `<w:keepNext/><w:spacing w:after="60" w:line="240" w:lineRule="auto"/>${jc}`
            )
          )
          if (pics[0].alt)
            body.push(para(await inline(pics[0].alt), `<w:pStyle w:val="Caption"/>${jc}`))
          break
        }
        // più immagini affiancate: una tabella senza bordi, con la didascalia sotto ciascuna
        const w = Math.floor(textW / pics.length)
        const cells = await Promise.all(
          pics.map(
            async (p) =>
              `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${para(p.run, '<w:spacing w:after="60" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>')}${para(
                p.alt ? await inline(p.alt) : '',
                '<w:pStyle w:val="Caption"/>'
              )}</w:tc>`
          )
        )
        body.push(
          `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${jc}<w:tblBorders>` +
            `<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>` +
            `<w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid>${`<w:gridCol w:w="${w}"/>`.repeat(
              pics.length
            )}</w:tblGrid><w:tr>${cells.join('')}</w:tr></w:tbl>`,
          para('', '<w:spacing w:after="0"/>')
        )
        break
      }
    }
  }

  const twips = (mm: number): number => Math.round(mm * TWIP)
  const margin = twips(settings.margin)
  const document_ =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>` +
    body.join('') +
    `<w:sectPr><w:pgSz w:w="${twips(pageW)}" w:h="${twips(pageH)}"/>` +
    `<w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" ` +
    `w:header="${Math.round(margin / 2)}" w:footer="${Math.round(margin / 2)}" w:gutter="0"/>` +
    `</w:sectPr></w:body></w:document>`

  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="png" ContentType="image/png"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
      `<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>` +
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
      `</Types>`
  )
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
      `</Relationships>`
  )
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ` +
      `xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(name)}</dc:title>` +
      `<dc:creator>Naibi</dc:creator></cp:coreProperties>`
  )
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
      `<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>` +
      media
        .map(
          (m) =>
            `<Relationship Id="${m.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.file}"/>`
        )
        .join('') +
      `</Relationships>`
  )
  zip.file('word/document.xml', document_)
  zip.file('word/styles.xml', stylesXml(settings, ctx))
  zip.file('word/numbering.xml', numberingXml(numbered))
  for (const m of media) zip.file(`word/media/${m.file}`, m.data)
  const data = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
  return [{ path: `${name}.docx`, data }]
}

/** Stili di Word: testo, titoli, citazione, codice, didascalia ed elenchi */
function stylesXml(s: DocSettings, ctx: DocumentContext): string {
  const pal = palette(ctx.variables)
  const font = s.font.trim() ? resolveFont(s.font, ctx.variables) : DEFAULT_FONT
  const headingFont = s.headingFont.trim() ? resolveFont(s.headingFont, ctx.variables) : font
  const color = hex(resolveColor(s.color, pal)) ?? '1D1D1F'
  const headingColor = (s.headingColor && hex(resolveColor(s.headingColor, pal))) || color
  const fonts = (f: string): string =>
    `<w:rFonts w:ascii="${esc(f)}" w:hAnsi="${esc(f)}" w:cs="${esc(f)}" w:eastAsia="${esc(f)}"/>`
  const sz = (pt: number): string =>
    `<w:sz w:val="${Math.round(pt * 2)}"/><w:szCs w:val="${Math.round(pt * 2)}"/>`
  const after = Math.round(s.paragraphSpacing * 20)
  const line = Math.round(s.lineHeight * 240)
  const heading = (n: number, em: number): string =>
    `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/>` +
    `<w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>` +
    `<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${Math.round(s.size * em * 1.1 * 20)}" ` +
    `w:after="${Math.round(s.size * em * 0.4 * 20)}" w:line="${Math.round(1.2 * 240)}" w:lineRule="auto"/>` +
    `<w:jc w:val="left"/><w:outlineLvl w:val="${n - 1}"/></w:pPr>` +
    `<w:rPr>${fonts(headingFont)}<w:b/><w:color w:val="${headingColor}"/>${sz(s.size * em)}</w:rPr></w:style>`
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:docDefaults><w:rPrDefault><w:rPr>${fonts(font)}<w:color w:val="${color}"/>${sz(s.size)}</w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr><w:spacing w:after="${after}" w:line="${line}" w:lineRule="auto"/></w:pPr></w:pPrDefault>` +
    `</w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>` +
    `<w:pPr>${s.align === 'justify' ? '<w:jc w:val="both"/>' : ''}</w:pPr></w:style>` +
    heading(1, 1.8) +
    heading(2, 1.36) +
    heading(3, 1.14) +
    `<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/>` +
    `<w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="B8B8B2"/></w:pBdr>` +
    `<w:shd w:val="clear" w:color="auto" w:fill="F3F3F0"/><w:ind w:left="227" w:right="113"/></w:pPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/>` +
    `<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F3F3F0"/>` +
    `<w:spacing w:line="240" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr>` +
    `<w:rPr>${fonts('Consolas')}${sz(s.size * 0.86)}</w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/><w:qFormat/>` +
    `<w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="55555A"/>${sz(s.size * 0.86)}</w:rPr></w:style>` +
    `<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/>` +
    `<w:qFormat/><w:pPr><w:spacing w:after="${Math.round(after / 2)}"/><w:contextualSpacing/></w:pPr></w:style>` +
    `</w:styles>`
  )
}

/** Puntati (numId 1) ed elenchi numerati, ognuno con il suo numero di partenza (numId 2…) */
function numberingXml(starts: number[]): string {
  const levels = (ordered: boolean): string =>
    [0, 1, 2, 3]
      .map(
        (i) =>
          `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${ordered ? 'decimal' : 'bullet'}"/>` +
          `<w:lvlText w:val="${ordered ? `%${i + 1}.` : '•'}"/><w:lvlJc w:val="left"/>` +
          `<w:pPr><w:ind w:left="${397 * (i + 1)}" w:hanging="284"/></w:pPr></w:lvl>`
      )
      .join('')
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${levels(false)}</w:abstractNum>` +
    `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${levels(true)}</w:abstractNum>` +
    `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>` +
    starts
      .map(
        (start, k) =>
          `<w:num w:numId="${k + 2}"><w:abstractNumId w:val="1"/>` +
          `<w:lvlOverride w:ilvl="0"><w:startOverride w:val="${start}"/></w:lvlOverride></w:num>`
      )
      .join('') +
    `</w:numbering>`
  )
}

/**
 * L'immagine da un data: URL: una caricata dal progetto direttamente renderebbe la tela
 * illeggibile, come ogni immagine di un'altra origine
 */
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const img = new Image()
  img.src = await dataUri(url)
  try {
    await img.decode()
    return img
  } catch {
    return null
  }
}

/** PNG di un'immagine a 300 punti per pollice, larga w e alta h millimetri, con la tinta */
async function raster(
  img: HTMLImageElement,
  w: number,
  h: number,
  tint?: string
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round((w / 25.4) * DPI))
  canvas.height = Math.max(1, Math.round((h / 25.4) * DPI))
  const c = canvas.getContext('2d')!
  c.drawImage(img, 0, 0, canvas.width, canvas.height)
  if (tint) {
    c.globalCompositeOperation = 'source-in'
    c.fillStyle = tint
    c.fillRect(0, 0, canvas.width, canvas.height)
  }
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('PNG encoding failed')
  return new Uint8Array(await blob.arrayBuffer())
}
