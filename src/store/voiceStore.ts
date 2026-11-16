import { create } from 'zustand'

/**
 * Estado de la voz que comparten la llamada y el panel de usuario.
 *
 * - `silenciado`: lo que eligió la persona para su micrófono.
 * - `ensordecido`: no escucha a nadie y, mientras dure, su micrófono también va apagado
 *   (como en Discord). Al quitarlo, el micrófono vuelve a como estaba.
 * - `subtitlesBlocked`: lo cambia el DemoPanel para mostrar la pantalla 13
 *   («subtítulos no disponibles») sin depender de la URL.
 *
 * Se reinicia al cerrar sesión (lib/sesion.ts).
 */
interface VoiceState {
  silenciado: boolean
  ensordecido: boolean
  subtitlesBlocked: boolean
  alternarSilencio: () => void
  alternarEnsordecido: () => void
  setSubtitlesBlocked: (blocked: boolean) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  silenciado: false,
  ensordecido: false,
  subtitlesBlocked: false,
  // con el audio apagado, pulsar el micrófono vuelve a encender las dos cosas
  alternarSilencio: () => set((s) => (s.ensordecido ? { ensordecido: false, silenciado: false } : { silenciado: !s.silenciado })),
  alternarEnsordecido: () => set((s) => ({ ensordecido: !s.ensordecido })),
  setSubtitlesBlocked: (subtitlesBlocked) => set({ subtitlesBlocked }),
}))

/** El micrófono va apagado si la persona lo silenció o si está ensordecida. */
export const micApagado = (s: Pick<VoiceState, 'silenciado' | 'ensordecido'>) => s.silenciado || s.ensordecido
