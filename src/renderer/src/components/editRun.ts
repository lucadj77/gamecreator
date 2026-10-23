import { changedRange, type DocEdit } from '../../../shared/model/docEdit'

/** Scrive il cambiamento nel campo come un'immissione da tastiera e rimette la selezione */
export function runEdit(
  el: HTMLTextAreaElement | null,
  edit: (src: string, a: number, b: number) => DocEdit
): void {
  if (!el) return
  const src = el.value
  const next = edit(src, el.selectionStart, el.selectionEnd)
  const r = changedRange(src, next.text)
  el.focus()
  el.setSelectionRange(r.from, r.to)
  // execCommand tiene la modifica nella cronologia del campo, a differenza di value =
  if (!document.execCommand('insertText', false, r.insert)) {
    el.setRangeText(r.insert, r.from, r.to)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  el.setSelectionRange(next.from, next.to)
}
