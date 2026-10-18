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
