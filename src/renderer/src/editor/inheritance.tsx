import { useContext } from 'react'
import { InheritContext } from './inheritContext'
import { useI18n } from '../i18n/context'
import { LinkIcon, RevertIcon } from '../components/icons'

// Segni dei template derivati nel pannello delle proprietà: un valore ereditato dal base ha la
// catena, un valore cambiato nel derivato la freccia, che lo riporta a quello del base.

/** Il segno accanto a una voce: catena se ereditata, freccia (cliccabile) se cambiata */
export function InheritMark({ keys }: { keys: string[] }): React.JSX.Element | null {
  const ctx = useContext(InheritContext)
  const { t } = useI18n()
  if (!ctx) return null
  const states = keys.map((p) => ctx.status(p))
  if (states.every((s) => s === null)) return null
  if (states.includes('changed'))
    return (
      <button
        type="button"
        className="inherit-mark changed"
        title={t('inherit.revert')}
        onClick={() => ctx.revert(keys.filter((_, i) => states[i] === 'changed'))}
      >
        <RevertIcon />
      </button>
    )
  return (
    <span className="inherit-mark" title={t('inherit.fromBase')}>
      <LinkIcon />
    </span>
  )
}

/** Voce del pannello fuori dalle sezioni, con il segno dell'ereditarietà */
export function Inherit({
  keys,
  children
}: {
  keys: string[]
  children: React.ReactNode
}): React.JSX.Element {
  const ctx = useContext(InheritContext)
  if (!ctx) return <>{children}</>
  return (
    <div className="inherit-item">
      {children}
      <InheritMark keys={keys} />
    </div>
  )
}
