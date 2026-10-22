import { useCallback, useState } from 'react'
import { MenuPanel, type MenuItem } from './Menu'

/** Menu che si apre col tasto destro, nel punto del clic */
export function useContextMenu(): {
  open(e: React.MouseEvent, items: MenuItem[]): void
  node: React.ReactNode
} {
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const close = useCallback(() => setMenu(null), [])
  return {
    open: (e, items) => {
      e.preventDefault()
      setMenu({ x: e.clientX, y: e.clientY, items })
    },
    node: menu && <MenuPanel x={menu.x} y={menu.y} items={menu.items} onClose={close} />
  }
}
