import { useEffect, useRef } from 'react'

/** Reproduce el audio de otra persona de la llamada. No se ve en pantalla. */
export default function AudioRemoto({ stream, activar, onBloqueado }: { stream: MediaStream; activar: number; onBloqueado: () => void }) {
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

  return <audio ref={ref} autoPlay />
}
