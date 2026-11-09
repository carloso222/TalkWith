import { useEffect } from 'react'
import { obtenerSocket } from '../lib/socket'
import { useLlamadasStore } from '../store/llamadasStore'
import type { ParticipanteLlamada } from '../types'

type Llamadas = Record<string, ParticipanteLlamada[]>

/** Pide al servidor quien esta en cada canal de voz del servidor y lo mantiene al dia. */
export function useLlamadasServidor(servidorId: string): Llamadas {
  const ponerLlamadas = useLlamadasStore((s) => s.ponerLlamadas)

  useEffect(() => {
    if (!servidorId) return
    const socket = obtenerSocket()

    const ver = () => {
      socket.emit('servidor:ver', { servidorId }, (r: { ok: boolean; llamadas?: Llamadas }) => {
        if (r?.ok) ponerLlamadas(servidorId, r.llamadas ?? {})
      })
    }
    const alCambiar = (aviso: { servidorId: string; llamadas: Llamadas }) => {
      if (aviso.servidorId === servidorId) ponerLlamadas(servidorId, aviso.llamadas)
    }

    socket.on('connect', ver)
    socket.on('servidor:llamadas', alCambiar)
    if (socket.connected) ver()

    return () => {
      socket.off('connect', ver)
      socket.off('servidor:llamadas', alCambiar)
    }
  }, [servidorId, ponerLlamadas])

  return useLlamadasStore((s) => s.porServidor[servidorId]) ?? {}
}
