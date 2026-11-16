import { useEffect, useRef, useState } from 'react'
import { mensajeErrorSocket, obtenerSocket } from '../lib/socket'
import { userService } from '../services'
import { useUiStore } from '../store/uiStore'
import type { EstadoConsentimiento, GrabacionSala } from '../types'
import type { FinGrabacion } from './useSalaVoz'

export type FaseGrabacion = 'inactiva' | 'esperando' | 'respondiendo' | 'grabando'
export type EstadosConsentimiento = Record<string, EstadoConsentimiento>

interface Opciones {
  yoUid: string
  /** Estado compartido que manda el servidor (useSalaVoz). */
  grabacion: GrabacionSala | null
  /** Último aviso de que terminó una grabación o una solicitud. */
  finGrabacion: FinGrabacion | null
}

interface Respuesta {
  ok: boolean
  error?: string
  grabacion?: GrabacionSala
}

const nombre = (uid: string) => userService.find(uid)?.nombre.split(' ')[0] ?? 'Alguien'

function errorGrabacion(codigo?: string): string {
  if (codigo === 'grabacion-en-curso') return 'Ya hay una grabación en curso o esperando respuestas.'
  if (codigo === 'sin-solicitud') return 'Esa solicitud ya no está vigente.'
  if (codigo === 'sin-grabacion') return 'No hay ninguna grabación en curso.'
  if (codigo === 'sin-sala') return 'Todavía no estás conectado a la llamada.'
  return mensajeErrorSocket(codigo)
}

/** Texto del aviso cuando termina una grabación o una solicitud. */
export function textoFin(fin: FinGrabacion, yoUid: string): { titulo: string; descripcion?: string } {
  const yo = fin.por === yoUid
  switch (fin.motivo) {
    case 'rechazada':
      return yo ? { titulo: 'Rechazaste la grabación' } : { titulo: 'No se grabará la llamada', descripcion: `${nombre(fin.por)} no aceptó la grabación.` }
    case 'cancelada':
      return { titulo: 'Solicitud de grabación cancelada', descripcion: yo ? undefined : `La canceló ${nombre(fin.por)}.` }
    case 'detenida':
      return { titulo: 'Grabación detenida', descripcion: yo ? undefined : `La detuvo ${nombre(fin.por)}.` }
    case 'salio':
      return { titulo: 'La grabación terminó', descripcion: yo ? 'Saliste de la llamada.' : `${nombre(fin.por)}, quien la pidió, salió de la llamada.` }
    case 'nuevo-participante':
      return { titulo: 'La grabación se detuvo', descripcion: `${nombre(fin.por)} entró a la llamada y no había aceptado. Pidan grabar otra vez si quieren seguir.` }
  }
}

/**
 * Grabación con consentimiento de todas las personas (Figma 14, 15 y 16; TW 20).
 * El estado vive en el servidor de socket.io, así que todos ven lo mismo:
 *  - solicitar(): pido grabar; a los demás les llega el diálogo.
 *  - aceptar()/rechazar(): mi respuesta. Si alguien rechaza, se cancela para todos.
 *  - Empieza cuando TODAS las personas aceptan y termina al detenerla o al salir quien la pidió.
 */
export function useRecordingFlow({ yoUid, grabacion: g, finGrabacion }: Opciones) {
  const notify = useUiStore((s) => s.notify)
  // diálogo: el participante lo ve hasta cerrarlo; quien pide, solo si lo abre
  const [abiertoPara, setAbiertoPara] = useState<number | null>(null)
  const [cerradoPara, setCerradoPara] = useState<number | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())

  let fase: FaseGrabacion = 'inactiva'
  if (g?.fase === 'grabando') fase = 'grabando'
  else if (g && g.estados[yoUid] === 'pendiente') fase = 'respondiendo'
  else if (g) fase = 'esperando'

  const dialogoAbierto = Boolean(g) && (fase === 'respondiendo' ? cerradoPara !== g!.id : fase === 'esperando' && abiertoPara === g!.id)

  // aviso cuando empieza (una vez por grabación)
  const avisadaRef = useRef<number | null>(null)
  useEffect(() => {
    if (g?.fase !== 'grabando' || avisadaRef.current === g.id) return
    avisadaRef.current = g.id
    notify('exito', 'Grabación iniciada', 'Todas las personas aceptaron. Todos ven el indicador «Grabando».')
  }, [g, notify])

  // aviso cuando termina, con el motivo
  useEffect(() => {
    if (!finGrabacion) return
    const { titulo, descripcion } = textoFin(finGrabacion, yoUid)
    notify('info', titulo, descripcion)
    // solo cuando llega un aviso nuevo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finGrabacion?.n])

  // cronómetro mientras se graba
  useEffect(() => {
    if (fase !== 'grabando') return
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [fase])
  const segundos = g?.fase === 'grabando' && g.inicio ? Math.max(0, Math.floor((ahora - g.inicio) / 1000)) : 0

  const emitir = (evento: string, datos: object, alTerminar?: (r: Respuesta) => void) =>
    obtenerSocket().emit(evento, datos, (r: Respuesta) => {
      if (!r?.ok) notify('error', 'No se pudo completar', errorGrabacion(r?.error))
      else alTerminar?.(r)
    })

  return {
    fase,
    estados: (g?.estados ?? {}) as EstadosConsentimiento,
    /** Personas a las que se les pidió (las que estaban en la llamada). */
    involucrados: g ? Object.keys(g.estados) : [],
    segundos,
    solicitanteUid: g?.solicitante ?? yoUid,
    dialogoAbierto,
    abrirDialogo: () => {
      if (!g) return
      setAbiertoPara(g.id)
      setCerradoPara(null)
    },
    cerrarDialogo: () => {
      if (!g) return
      setCerradoPara(g.id)
      setAbiertoPara(null)
    },
    solicitar: () => {
      setAhora(Date.now())
      emitir('grabacion:solicitar', {}, (r) => r.grabacion && setAbiertoPara(r.grabacion.id))
    },
    aceptar: () => {
      if (!g) return
      emitir('grabacion:responder', { id: g.id, acepta: true }, () => notify('info', 'Aceptaste la grabación', 'Empezará cuando todas las personas acepten.'))
    },
    rechazar: () => g && emitir('grabacion:responder', { id: g.id, acepta: false }),
    cancelar: () => emitir('grabacion:cancelar', {}),
    detener: () => emitir('grabacion:detener', {}),
  }
}
