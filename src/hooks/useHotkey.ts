import { useEffect } from 'react'

/** Atajo de teclado global, p. ej. useHotkey('k', abrirBusqueda, { ctrl: true }). */
export function useHotkey(key: string, handler: () => void, { ctrl = false } = {}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return
      if (ctrl && !(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      handler()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, handler, ctrl])
}
