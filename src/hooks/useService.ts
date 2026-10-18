import { useEffect, useState } from 'react'

/**
 * Llama a un servicio (que devuelve una Promise) y expone { data, loading }.
 * Equivalente a suscribirse a un Observable en un componente de Angular.
 *
 *   const { data: servidores, loading } = useService(() => serverService.getMine(), [])
 */
export function useService<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; loading: boolean }>({ data: null, loading: true })

  // Las dependencias las define quien llama, igual que en useEffect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let vigente = true
    setState((s) => ({ ...s, loading: true }))
    fn().then((data) => {
      if (vigente) setState({ data, loading: false })
    })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
