import { useEffect, useState } from 'react'
import { mensajeDeError } from '../services/errores'

/**
 * Llama a un servicio (que devuelve una Promise) y expone { data, loading, error, recargar }.
 * Equivalente a suscribirse a un Observable en un componente de Angular.
 *
 *   const { data: servidores, loading, error, recargar } = useService(() => serverService.getMine(), [])
 */
export function useService<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // cambia este numero para volver a pedir los datos
  const [intento, setIntento] = useState(0)

  // Las dependencias las define quien llama, igual que en useEffect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let vigente = true
    setLoading(true)
    setError(null)
    fn()
      .then((respuesta) => {
        if (!vigente) return
        setData(respuesta)
        setLoading(false)
      })
      .catch((e) => {
        if (!vigente) return
        setError(mensajeDeError(e))
        setLoading(false)
      })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, intento])

  const recargar = () => setIntento((n) => n + 1)

  return { data, loading, error, recargar }
}
