import { useEffect, useRef, useState } from 'react'

export type EstadoMicrofono = 'pidiendo' | 'listo' | 'denegado' | 'sin-microfono' | 'no-soportado' | 'error'

// arriba de este nivel consideramos que la persona esta hablando
const UMBRAL_VOZ = 0.12

// pide acceso al microfono y lo libera al salir de la sala
export function useMicrofono() {
  const soportado = Boolean(navigator.mediaDevices?.getUserMedia)
  const [estado, setEstado] = useState<EstadoMicrofono>(soportado ? 'pidiendo' : 'no-soportado')
  const [silenciado, setSilenciado] = useState(false)
  const [nivel, setNivel] = useState(0)
  const [dispositivos, setDispositivos] = useState<MediaDeviceInfo[]>([])
  // microfono que eligio el usuario ('' = el predeterminado)
  const [elegido, setElegido] = useState('')
  // microfono que se esta usando ahora
  const [actual, setActual] = useState('')
  // cambia este numero para volver a pedir permiso
  const [intento, setIntento] = useState(0)
  const streamRef = useRef<MediaStream | null>(null)
  // pista de audio que se manda a las demas personas (webrtc)
  const [pistaActual, setPistaActual] = useState<MediaStreamTrack | null>(null)

  useEffect(() => {
    if (!soportado) return

    let activo = true
    let contexto: AudioContext | null = null
    let intervalo: number | undefined

    const audio = elegido ? { deviceId: { exact: elegido } } : true
    navigator.mediaDevices
      .getUserMedia({ audio })
      .then(async (stream) => {
        if (!activo) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const pista = stream.getAudioTracks()[0]
        setActual(pista?.getSettings().deviceId ?? '')
        setPistaActual(pista ?? null)
        // si desconectan el microfono a medio llamada
        pista?.addEventListener('ended', () => activo && setEstado('sin-microfono'))

        const todos = await navigator.mediaDevices.enumerateDevices()
        if (!activo) return
        setDispositivos(todos.filter((d) => d.kind === 'audioinput'))

        contexto = new AudioContext()
        const analizador = contexto.createAnalyser()
        analizador.fftSize = 512
        contexto.createMediaStreamSource(stream).connect(analizador)
        const muestras = new Uint8Array(analizador.fftSize)
        intervalo = window.setInterval(() => {
          analizador.getByteTimeDomainData(muestras)
          let suma = 0
          for (const m of muestras) suma += ((m - 128) / 128) ** 2
          setNivel(Math.min(1, Math.sqrt(suma / muestras.length) * 4))
        }, 100)

        setEstado('listo')
      })
      .catch((error: DOMException) => {
        if (!activo) return
        if (error.name === 'NotAllowedError' || error.name === 'SecurityError') setEstado('denegado')
        else if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') setEstado('sin-microfono')
        else setEstado('error')
      })

    return () => {
      activo = false
      window.clearInterval(intervalo)
      contexto?.close()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setPistaActual(null)
    }
  }, [soportado, elegido, intento])

  // silenciar apaga la pista de audio de verdad
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !silenciado))
  }, [silenciado, estado])

  const listo = estado === 'listo'

  return {
    estado,
    listo,
    silenciado: silenciado || !listo,
    hablando: listo && !silenciado && nivel > UMBRAL_VOZ,
    nivel: listo && !silenciado ? nivel : 0,
    dispositivos,
    dispositivoActual: actual,
    pista: listo ? pistaActual : null,
    alternarSilencio: () => setSilenciado(!silenciado),
    cambiarDispositivo: (id: string) => {
      setEstado('pidiendo')
      setElegido(id)
    },
    reintentar: () => {
      if (!soportado) return
      setEstado('pidiendo')
      setIntento(intento + 1)
    },
  }
}
