import { useEffect, useRef } from 'react'

/**
 * "Directiva" de auto-scroll: mantiene un contenedor desplazado hasta abajo
 * cuando cambia `dep` (por ejemplo, la lista de mensajes de un canal).
 *
 *   const ref = useAutoScroll<HTMLDivElement>(mensajes.length)
 *   <div ref={ref} className="overflow-y-auto">…</div>
 */
export function useAutoScroll<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [dep])
  return ref
}
