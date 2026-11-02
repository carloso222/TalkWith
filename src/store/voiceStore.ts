import { create } from 'zustand'

/**
 * Estado de demo de la sala de voz. Lo cambia el DemoPanel para mostrar
 * la pantalla 13 («subtítulos no disponibles») sin depender de la URL.
 */
interface VoiceState {
  subtitlesBlocked: boolean
  setSubtitlesBlocked: (blocked: boolean) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  subtitlesBlocked: false,
  setSubtitlesBlocked: (subtitlesBlocked) => set({ subtitlesBlocked }),
}))