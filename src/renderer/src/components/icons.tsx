/** Icona immagine: cornice con montagna e sole, nel colore del testo */
export function ImageIcon(): React.JSX.Element {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ verticalAlign: '-0.125em' }}
    >
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <circle cx="11" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <path d="M1.5 12 L6 7.5 L9.5 11 L11 9.5 L14.5 13" />
    </svg>
  )
}

/** Fonte "colonna del foglio": una piccola tabella */
export function ColumnIcon(): React.JSX.Element {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <rect x="2" y="2.5" width="12" height="11" rx="1" />
      <path d="M2 6.5h12M6.5 6.5v7" />
    </svg>
  )
}

/** Fonte "valore fisso": una puntina */
export function FixedIcon(): React.JSX.Element {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="6" r="3.5" />
      <path d="M8 9.5V14.5" />
    </svg>
  )
}

/** Tratto comune delle icone della barra laterale */
function Outline({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Set: un mazzo di carte */
export function SetsIcon(): React.JSX.Element {
  return (
    <Outline>
      <rect x="5" y="1.5" width="8.5" height="11" rx="1.2" />
      <path d="M3 4v8.5a1.5 1.5 0 0 0 1.5 1.5H10" />
    </Outline>
  )
}

/** Template: una carta con titolo, immagine e testo */
export function TemplateIcon(): React.JSX.Element {
  return (
    <Outline>
      <rect x="3" y="1.5" width="10" height="13" rx="1.2" />
      <path d="M5.5 4.5h5M5.5 7h5v2.5h-5zM5.5 12h3" />
    </Outline>
  )
}

/** Stili di testo: una T con le righe del paragrafo */
export function StylesIcon(): React.JSX.Element {
  return (
    <Outline>
      <path d="M2 3h7M5.5 3v9M11 7h3M11 10h3M8.5 13h5.5" />
    </Outline>
  )
}

/** Variabili: le graffe di {nome} */
export function VariablesIcon(): React.JSX.Element {
  return (
    <Outline>
      <path d="M6 2.5c-1.5 0-2 .6-2 1.8v1.9c0 1-.5 1.6-1.5 1.8 1 .2 1.5.8 1.5 1.8v1.9c0 1.2.5 1.8 2 1.8M10 2.5c1.5 0 2 .6 2 1.8v1.9c0 1 .5 1.6 1.5 1.8-1 .2-1.5.8-1.5 1.8v1.9c0 1.2-.5 1.8-2 1.8" />
    </Outline>
  )
}

/** Riduce il pannello a icone, o lo riapre: un pannello con la colonna laterale */
export function PanelIcon(): React.JSX.Element {
  return (
    <Outline>
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M6 2.5v11" />
    </Outline>
  )
}

/** Freccia di una sezione: in basso se aperta, a destra se chiusa */
export function ChevronIcon({ open }: { open: boolean }): React.JSX.Element {
  return (
    <svg
      width="0.8em"
      height="0.8em"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? undefined : 'rotate(-90deg)', transition: 'transform 0.15s' }}
    >
      <path d="M3.5 6l4.5 4.5L12.5 6" />
    </svg>
  )
}

/** Elimina: un cestino */
export function TrashIcon(): React.JSX.Element {
  return (
    <Outline>
      <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.8 6.5v4.5M9.2 6.5v4.5" />
    </Outline>
  )
}
