import { useEffect, useState } from 'react'
import { mensajeErrorSocket, obtenerSocket } from '../lib/socket'
import type { ParticipanteLlamada } from '../types'

export type EstadoSala = 'conectando' | 'conectado' | 'reconectando' | 'error'

interface RespuestaUnirse {
  ok: boolean
  error?: string
  sesionId?: string | null
  inicio?: number
  conexion?: number
  participantes?: ParticipanteLlamada[]
}

interface AvisoSala {
  servidorId: string
  canalId: string
  participantes: ParticipanteLlamada[]
}

// cuanto seguimos diciendo "hablando" despues de la ultima vez que se escucho voz
const PAUSA_HABLANDO_MS = 800

/**
 * Entra a la sala de voz por socket.io y mantiene la lista de participantes.
 * Si se cae la conexion vuelve a entrar solo al reconectar.
 */
export function useSalaVoz(servidorId: string, canalId: string, yo: { silenciado: boolean; hablando: boolean }) {
  const [estado, setEstado] = useState<EstadoSala>('conectando')
  const [error, setError] = useState('')
  const [participantes, setParticipantes] = useState<ParticipanteLlamada[]>([])
  const [sesionId, setSesionId] = useState<string | null>(null)
  const [inicio, setInicio] = useState<number | null>(null)
  // mi numero de conexion en la sala (lo usa el audio para saber cuando rehacerse)
  const [conexion, setConexion] = useState(0)
  // cambia este numero para volver a intentar
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const socket = obtenerSocket()
    let activo = true

    const unirse = () => {
      socket.emit('sala:unirse', { servidorId, canalId }, (r: RespuestaUnirse) => {
        if (!activo) return
        if (!r?.ok) {
          setEstado('error')
          setError(mensajeErrorSocket(r?.error))
          return
        }
        setEstado('conectado')
        setError('')
        setParticipantes(r.participantes ?? [])
        setSesionId(r.sesionId ?? null)
        setInicio(r.inicio ?? null)
        setConexion(r.conexion ?? 0)
      })
    }

    const alDesconectar = () => setEstado('reconectando')

    const alFallar = (err: Error) => {
      // si socket.active sigue en true, socket.io vuelve a intentar solo
      if (socket.active) {
        setEstado('reconectando')
      } else {
        setEstado('error')
        setError(mensajeErrorSocket(err.message))
      }
    }

    const alCambiar = (aviso: AvisoSala) => {
      if (aviso.servidorId === servidorId && aviso.canalId === canalId) setParticipantes(aviso.participantes)
    }

    socket.on('connect', unirse)
    socket.on('disconnect', alDesconectar)
    socket.on('connect_error', alFallar)
    socket.on('sala:participantes', alCambiar)
    if (socket.connected) unirse()

    return () => {
      activo = false
      socket.off('connect', unirse)
      socket.off('disconnect', alDesconectar)
      socket.off('connect_error', alFallar)
      socket.off('sala:participantes', alCambiar)
      if (socket.connected) socket.emit('sala:salir')
    }
  }, [servidorId, canalId, intento])

  // avisa a los demas si me silencie o estoy hablando
  useEffect(() => {
    if (estado !== 'conectado') return
    const socket = obtenerSocket()
    if (yo.hablando || yo.silenciado) {
      socket.emit('sala:estado', { silenciado: yo.silenciado, hablando: yo.hablando })
      return
    }
    // el nivel del micro sube y baja muy rapido, asi que esperamos un poco antes de avisar que ya no habla
    const t = setTimeout(() => socket.emit('sala:estado', { silenciado: false, hablando: false }), PAUSA_HABLANDO_MS)
    return () => clearTimeout(t)
  }, [estado, yo.silenciado, yo.hablando])

  const reintentar = () => {
    setEstado('conectando')
    setError('')
    setIntento(intento + 1)
  }

  return { estado, error, participantes, sesionId, inicio, conexion, reintentar }
}
