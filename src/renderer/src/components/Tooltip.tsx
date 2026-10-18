import { useEffect, useState } from 'react'

// Suggerimenti dell'app: il testo di `title` compare in un riquadro dopo una breve sosta
// del puntatore, con lo stesso aspetto in tutta l'app e nei due temi. L'attributo si sposta
// in data-tip per non mostrare anche il suggerimento nativo.

const DELAY_MS = 700
const GAP = 6

interface Tip {
  text: string
  x: number
  y: number
  below: boolean
}

function tipTarget(el: EventTarget | null): HTMLElement | null {
  if (!(el instanceof Element)) return null
  const found = el.closest<HTMLElement>('[title], [data-tip]')
  // gli elementi SVG hanno i loro <title>; l'overlay della tela non ne ha
  return found instanceof HTMLElement ? found : null
}

function takeTitle(el: HTMLElement): string {
  const title = el.getAttribute('title')
  if (title !== null) {
    // React riscrive title quando cambia: il valore nuovo ha la precedenza
    el.removeAttribute('title')
    if (title) el.dataset.tip = title
    else delete el.dataset.tip
    // un pulsante con la sola icona conserva il nome per l'accessibilità
    if (!el.getAttribute('aria-label') && !el.textContent?.trim() && title)
      el.setAttribute('aria-label', title)
  }
  return el.dataset.tip ?? ''
}

export default function Tooltip(): React.JSX.Element | null {
  const [tip, setTip] = useState<Tip | null>(null)

  useEffect(() => {
    let timer: number | undefined
    let current: HTMLElement | null = null
    const hide = (): void => {
      window.clearTimeout(timer)
      current = null
      setTip(null)
    }
    const onOver = (e: PointerEvent): void => {
      const el = tipTarget(e.target)
      if (el === current) return
      hide()
      if (!el) return
      const text = takeTitle(el)
      if (!text) return
      current = el
      timer = window.setTimeout(() => {
        if (current !== el || !el.isConnected) return
        const r = el.getBoundingClientRect()
        const below = r.bottom + 60 < window.innerHeight
        setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom + GAP : r.top - GAP, below })
      }, DELAY_MS)
    }
    window.addEventListener('pointerover', onOver)
    window.addEventListener('pointerdown', hide, true)
    window.addEventListener('keydown', hide, true)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('blur', hide)
    return () => {
      hide()
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', hide, true)
      window.removeEventListener('keydown', hide, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('blur', hide)
    }
  }, [])

  if (!tip) return null
  return (
    <div
      className="tooltip"
      role="tooltip"
      ref={(el) => {
        // il riquadro resta dentro la finestra anche vicino ai bordi
        if (!el) return
        const w = el.offsetWidth
        const left = Math.min(Math.max(4, tip.x - w / 2), window.innerWidth - w - 4)
        el.style.left = `${left}px`
      }}
      style={{
        left: tip.x,
        top: tip.y,
        transform: tip.below ? undefined : 'translateY(-100%)'
      }}
    >
      {tip.text}
    </div>
  )
}
