import { useEffect, useState } from 'react'
import { useVoiceStore } from '../store/voiceStore'

/**
 * Los subtítulos dependen del micrófono. Devuelve false si:
 *  - el permiso está bloqueado en el navegador,
 *  - se activó «No disponibles» en el Modo demo, o
 *  - se fuerza con ?demo=sin-subtitulos.
 */
export function useSubtitlesAvailable(forceUnavailable: boolean) {
  const [blocked, setBlocked] = useState(false)
  const blockedByDemo = useVoiceStore((s) => s.subtitlesBlocked)

  useEffect(() => {
    if (!('permissions' in navigator)) return
    let alive = true
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((p) => {
        if (!alive) return
        setBlocked(p.state === 'denied')
        p.onchange = () => alive && setBlocked(p.state === 'denied')
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return !forceUnavailable && !blockedByDemo && !blocked
}