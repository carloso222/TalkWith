import { useCallback, useEffect, useRef, useState } from 'react'
import { useUiStore } from '../store/uiStore'
import type { EstadoConsentimiento } from '../types'

export type FaseGrabacion = 'inactiva' | 'esperando' | 'respondiendo' | 'grabando'
export type EstadosConsentimiento = Record<string, EstadoConsentimiento>

interface Opciones {
  yoUid: string
  participantes: string[]
  /** Valor de ?demo=… para forzar los estados del Figma (rechazo | solicitud | grabando). */
  demo: string | null
}

/** 00:03:12, el cronómetro que muestra el Figma 16. */
const SEGUNDOS_DEMO = 192

/**
 * Flujo de grabación con consentimiento (Figma 14, 15 y 16). Todo simulado:
 *  - solicitar(): yo pido grabar; las respuestas llegan con temporizadores.
 *  - recibirSolicitud(): otra persona pide grabar y me toca responder.
 *  - La grabación empieza solo cuando TODAS las personas aceptaron.
 */
export function useRecordingFlow({ yoUid, participantes, demo }: Opciones) {
  const notify = useUiStore((s) => s.notify)
  const [fase, setFase] = useState<FaseGrabacion>(demo === 'grabando' ? 'grabando' : 'inactiva')
  const [solicitanteUid, setSolicitanteUid] = useState(yoUid)
  const [estados, setEstados] = useState<EstadosConsentimiento>({})
  const [segundos, setSegundos] = useState(demo === 'grabando' ? SEGUNDOS_DEMO : 0)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const timers = useRef<number[]>([])

  const limpiar = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const responderEn = (uid: string, estado: EstadoConsentimiento, ms: number) => {
    timers.current.push(window.setTimeout(() => setEstados((e) => ({ ...e, [uid]: estado })), ms))
  }

  /** Yo pido grabar (Figma 14). */
  const solicitar = useCallback(() => {
    limpiar()
    const otros = participantes.filter((u) => u !== yoUid)
    setSolicitanteUid(yoUid)
    setEstados(Object.fromEntries(participantes.map((u) => [u, u === yoUid ? 'aceptado' : 'pendiente'])))
    setFase('esperando')
    setDialogoAbierto(true)
    otros.forEach((uid, i) => {
      // ?demo=rechazo: Diego rechaza y Mateo nunca responde, igual que en Figma 14.
      if (demo === 'rechazo' && uid === 'u-mateo') return
      const respuesta: EstadoConsentimiento = demo === 'rechazo' && uid === 'u-diego' ? 'rechazado' : 'aceptado'
      responderEn(uid, respuesta, 1200 * (i + 1))
    })
  }, [participantes, yoUid, demo])

  /** Otra persona pide grabar y yo debo responder (Figma 15). */
  const recibirSolicitud = useCallback(
    (quien: string) => {
      limpiar()
      setSolicitanteUid(quien)
      setEstados(
        Object.fromEntries(
          participantes.map((u): [string, EstadoConsentimiento] => [
            u,
            u === quien ? 'aceptado' : u === yoUid ? 'pendiente' : u === 'u-diego' ? 'rechazado' : 'aceptado',
          ]),
        ),
      )
      setFase('respondiendo')
      setDialogoAbierto(true)
    },
    [participantes, yoUid],
  )

  useEffect(() => {
    if (demo === 'solicitud' && yoUid) recibirSolicitud('u-sofia')
    // Solo al montar la sala.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aceptar = () => {
    setEstados((e) => ({ ...e, [yoUid]: 'aceptado' }))
    setDialogoAbierto(false)
    notify('info', 'Aceptaste la grabación', 'Empezará cuando todas las personas acepten.')
  }

  const rechazar = () => {
    setEstados((e) => ({ ...e, [yoUid]: 'rechazado' }))
    setFase('inactiva')
    setDialogoAbierto(false)
    notify('info', 'Rechazaste la solicitud de grabación')
  }

  const cancelar = () => {
    limpiar()
    setFase('inactiva')
    setDialogoAbierto(false)
    notify('info', 'Solicitud de grabación cancelada')
  }

  const detener = () => {
    setFase('inactiva')
    notify('exito', 'Grabación detenida', 'La encontrarás en Grabaciones.')
  }

  // La grabación arranca cuando todas las personas aceptaron.
  useEffect(() => {
    if (fase !== 'esperando' && fase !== 'respondiendo') return
    if (participantes.length && participantes.every((u) => estados[u] === 'aceptado')) {
      setFase('grabando')
      setSegundos(0)
      setDialogoAbierto(false)
      notify('exito', 'Grabación iniciada', 'Todas las personas aceptaron.')
    }
  }, [estados, fase, participantes, notify])

  // Cronómetro de la grabación.
  useEffect(() => {
    if (fase !== 'grabando') return
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [fase])

  return {
    fase,
    estados,
    segundos,
    solicitanteUid,
    dialogoAbierto,
    abrirDialogo: () => setDialogoAbierto(true),
    cerrarDialogo: () => setDialogoAbierto(false),
    solicitar,
    recibirSolicitud,
    aceptar,
    rechazar,
    cancelar,
    detener,
  }
}