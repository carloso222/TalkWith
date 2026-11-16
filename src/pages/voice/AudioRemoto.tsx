import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream
  activar: number
  onBloqueado: () => void
  /** true cuando la persona se ensordeció: el audio sigue llegando pero no suena. */
  silenciar?: boolean
}

/** Reproduce el audio de otra persona de la llamada. No se ve en pantalla. */
export default function AudioRemoto({ stream, activar, onBloqueado, silenciar = false }: Props) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = ref.current
    if (!audio) return
    if (audio.srcObject !== stream) audio.srcObject = stream
    // el navegador puede bloquear el audio hasta que la persona haga clic
    audio.play().catch(() => onBloqueado())
    // activar cambia cuando la persona pulsa "Activar audio"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, activar])

  // se pone directo en el elemento: react no siempre actualiza `muted` en <audio>
  useEffect(() => {
    if (ref.current) ref.current.muted = silenciar
  }, [silenciar])

  return <audio ref={ref} autoPlay />
}
