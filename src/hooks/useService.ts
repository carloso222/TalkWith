import { useEffect, useRef, useState } from 'react'
import { mensajeDeError } from '../services/errores'
import { useDatosStore } from '../store/datosStore'

/**
 * Llama a un servicio (que devuelve una Promise) y expone { data, loading, error, recargar }.
 * Equivalente a suscribirse a un Observable en un componente de Angular.
 *
 *   const { data: servidores, loading, error, recargar } = useService(() => serverService.getMine(), [])
 *
 * Además vuelve a llamar al servicio cuando cambia la caché de Firestore (`datosStore`),
 * sin mostrar el estado de carga si ya había datos, para que la pantalla no parpadee.
 */
export function useService<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // cambia este numero para volver a pedir los datos
  const [intento, setIntento] = useState(0)
  const version = useDatosStore((s) => s.version)
  const anteriores = useRef<{ deps: unknown[]; intento: number } | null>(null)

  // Las dependencias las define quien llama, igual que en useEffect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let vigente = true
    const previas = anteriores.current
    const soloCambioLaCache =
      previas !== null && previas.intento === intento && previas.deps.length === deps.length && previas.deps.every((d, i) => Object.is(d, deps[i]))
    anteriores.current = { deps, intento }
    if (!soloCambioLaCache) {
      setLoading(true)
      setError(null)
    }
    fn()
      .then((respuesta) => {
        if (!vigente) return
        setData(respuesta)
        setError(null)
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
  }, [...deps, intento, version])

  const recargar = () => setIntento((n) => n + 1)

  return { data, loading, error, recargar }
}
