import { useEffect, useRef } from 'react'

/**
 * "Directiva" click-outside: ejecuta `onOutside` cuando se hace clic fuera del
 * elemento o se presiona Escape. Útil para menús desplegables y popovers.
 */
export function useClickOutside<T extends HTMLElement>(onOutside: () => void, activo = true) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!activo) return
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [onOutside, activo])
  return ref
}
