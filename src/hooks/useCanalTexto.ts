import { useEffect, useState } from 'react'
import { mensajeErrorSocket, obtenerSocket } from '../lib/socket'
import { horaCorta } from '../lib/time'
import { messageService } from '../services'
import { mensajeDeError } from '../services/errores'
import { desdeSocket, ordenarMensajes, type MensajeSocket } from '../services/mensajes'
import { useUiStore } from '../store/uiStore'
import type { Mensaje } from '../types'

export type EstadoCanal = 'conectando' | 'conectado' | 'reconectando' | 'error'

/** Mensaje en pantalla; `enviando` = todavia no lo confirma el servidor. */
export type MensajeVista = Mensaje & { enviando?: boolean }

interface Respuesta {
  ok: boolean
  error?: string
  mensaje?: MensajeSocket
}

// textos para los errores al mandar un mensaje
function errorAlEnviar(codigo?: string): string {
  if (codigo === 'muy-rapido') return 'Estás enviando mensajes muy rápido. Espera unos segundos.'
  if (codigo === 'mensaje-invalido') return 'El mensaje está vacío o es demasiado largo.'
  return mensajeErrorSocket(codigo)
}

// junta dos listas sin repetir mensajes
function juntar(a: Mensaje[], b: Mensaje[]): Mensaje[] {
  const porId = new Map<string, Mensaje>()
  for (const m of [...a, ...b]) porId.set(m.mensajeId, m)
  return ordenarMensajes([...porId.values()])
}

/**
 * Chat de un canal de texto (TW 09): carga el historial de firestore,
 * recibe los mensajes nuevos por socket.io y manda los mios.
 */
export function useCanalTexto(servidorId: string, canalId: string, miUid: string) {
  const notify = useUiStore((s) => s.notify)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [pendientes, setPendientes] = useState<MensajeVista[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [estado, setEstado] = useState<EstadoCanal>('conectando')
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  // historial guardado
  useEffect(() => {
    let activo = true
    messageService
      .getByChannel(servidorId, canalId)
      .then((lista) => activo && setMensajes((actuales) => juntar(actuales, lista)))
      .catch((e) => activo && setErrorCarga(mensajeDeError(e)))
      .finally(() => activo && setCargando(false))
    return () => {
      activo = false
    }
  }, [servidorId, canalId])

  // mensajes en vivo
  useEffect(() => {
    const socket = obtenerSocket()
    let activo = true
    let primeraVez = true

    const entrar = () => {
      socket.emit('canal:entrar', { servidorId, canalId }, (r: Respuesta) => {
        if (!activo) return
        if (!r?.ok) {
          setEstado('error')
          setError(mensajeErrorSocket(r?.error))
          return
        }
        setEstado('conectado')
        setError('')
        // si se cayo la conexion pudimos perder mensajes, los volvemos a pedir
        if (!primeraVez) {
          messageService
            .getByChannel(servidorId, canalId)
            .then((lista) => activo && setMensajes((actuales) => juntar(actuales, lista)))
            .catch(() => {})
        }
        primeraVez = false
      })
    }

    const alDesconectar = () => setEstado('reconectando')

    const alFallar = (err: Error) => {
      if (socket.active) {
        setEstado('reconectando')
      } else {
        setEstado('error')
        setError(mensajeErrorSocket(err.message))
      }
    }

    const alLlegar = (m: MensajeSocket) => {
      if (m.servidorId === servidorId && m.canalId === canalId) setMensajes((actuales) => juntar(actuales, [desdeSocket(m)]))
    }

    socket.on('connect', entrar)
    socket.on('disconnect', alDesconectar)
    socket.on('connect_error', alFallar)
    socket.on('mensaje:nuevo', alLlegar)
    if (socket.connected) entrar()

    return () => {
      activo = false
      socket.off('connect', entrar)
      socket.off('disconnect', alDesconectar)
      socket.off('connect_error', alFallar)
      socket.off('mensaje:nuevo', alLlegar)
      if (socket.connected) socket.emit('canal:salir')
    }
  }, [servidorId, canalId, intento])

  /** Manda un mensaje. Si no hay conexion, socket.io lo guarda y lo manda al reconectar. */
  const enviar = (contenido: string) => {
    const limpio = contenido.trim()
    if (!limpio) return
    const id = `pendiente-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const ahora = new Date()
    setPendientes((p) => [...p, { mensajeId: id, canalId, autorUid: miUid, contenido: limpio, creadoEn: horaCorta(ahora), creadoMs: ahora.getTime(), enviando: true }])

    obtenerSocket().emit('mensaje:enviar', { servidorId, canalId, contenido: limpio }, (r: Respuesta) => {
      setPendientes((p) => p.filter((m) => m.mensajeId !== id))
      if (r?.ok && r.mensaje) setMensajes((actuales) => juntar(actuales, [desdeSocket(r.mensaje!)]))
      else notify('error', 'No se envió tu mensaje', errorAlEnviar(r?.error))
    })
  }

  const reintentar = () => {
    setEstado('conectando')
    setError('')
    setIntento(intento + 1)
  }

  const todos: MensajeVista[] = [...mensajes, ...pendientes]
  return { mensajes: todos, cargando, errorCarga, estado, error, enviar, reintentar }
}
