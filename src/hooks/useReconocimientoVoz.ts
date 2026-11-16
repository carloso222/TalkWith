import { useEffect, useRef, useState } from 'react'

// tipos minimos de la web speech api (no vienen en lib.dom para webkitSpeechRecognition)
interface ResultadoVoz {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}
interface EventoResultadoVoz {
  readonly resultIndex: number
  readonly results: { readonly length: number; readonly [i: number]: ResultadoVoz }
}
interface Reconocedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: EventoResultadoVoz) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type ConstructorReconocedor = new () => Reconocedor

export type EstadoReconocimiento = 'inactivo' | 'escuchando' | 'denegado' | 'no-soportado' | 'error'

const IDIOMA = 'es-MX'
// chrome corta el reconocimiento tras un rato de silencio; lo volvemos a arrancar
const ESPERA_REINICIO_MS = 300

export function obtenerReconocedor(): ConstructorReconocedor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: ConstructorReconocedor; webkitSpeechRecognition?: ConstructorReconocedor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

interface Opciones {
  /** true mientras se deba escuchar (en la sala y con el micrófono abierto). */
  activo: boolean
  /** Se llama con cada frase terminada. */
  alFinal: (texto: string) => void
}

/**
 * Subtítulos en vivo (TW 15): convierte la voz del usuario en texto con la API del navegador.
 * Solo funciona en Chrome y Edge. Ojo: el reconocimiento abre el micrófono por su cuenta,
 * así que silenciar la pista de webrtc no lo detiene; por eso depende de `activo`.
 */
export function useReconocimientoVoz({ activo, alFinal }: Opciones) {
  const Reconocedor = obtenerReconocedor()
  // solo guardamos el fallo; los demas estados salen de `activo` y del soporte
  const [fallo, setFallo] = useState<'denegado' | 'error' | null>(null)
  const [parcial, setParcial] = useState('')
  // la ultima version de alFinal, sin reiniciar el reconocimiento cada render
  const alFinalRef = useRef(alFinal)
  useEffect(() => {
    alFinalRef.current = alFinal
  }, [alFinal])

  useEffect(() => {
    if (!Reconocedor || !activo) return

    let vivo = true
    let reinicio: number | undefined
    const rec = new Reconocedor()
    rec.lang = IDIOMA
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      let provisional = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const texto = r[0].transcript.trim()
        if (!texto) continue
        if (r.isFinal) alFinalRef.current(texto)
        else provisional += (provisional ? ' ' : '') + texto
      }
      setParcial(provisional)
    }

    rec.onerror = (e) => {
      // sin voz o cortado por nosotros: no es un error real
      if (e.error === 'no-speech' || e.error === 'aborted') return
      vivo = false
      setParcial('')
      setFallo(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denegado' : 'error')
    }

    rec.onend = () => {
      setParcial('')
      if (!vivo) return
      reinicio = window.setTimeout(() => {
        if (!vivo) return
        try {
          rec.start()
        } catch {
          // ya estaba arrancado
        }
      }, ESPERA_REINICIO_MS)
    }

    rec.start()

    return () => {
      vivo = false
      window.clearTimeout(reinicio)
      rec.onresult = rec.onerror = rec.onend = null
      rec.abort()
      // al volver a activar se intenta de nuevo desde cero
      setParcial('')
      setFallo(null)
    }
  }, [Reconocedor, activo])

  let estado: EstadoReconocimiento
  if (!Reconocedor) estado = 'no-soportado'
  else if (!activo) estado = 'inactivo'
  else estado = fallo ?? 'escuchando'

  return { soportado: Boolean(Reconocedor), estado, parcial }
}
