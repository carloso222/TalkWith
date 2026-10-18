import { useEffect, useState } from 'react'

/** "Directiva" debounce: devuelve `value` después de `ms` sin cambios (buscador global). */
export function useDebounce<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}
