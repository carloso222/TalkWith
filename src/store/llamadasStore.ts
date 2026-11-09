import { create } from 'zustand'
import type { ParticipanteLlamada } from '../types'

// quien esta en cada canal de voz: servidorId -> canalId -> participantes
type Llamadas = Record<string, ParticipanteLlamada[]>

interface LlamadasState {
  porServidor: Record<string, Llamadas>
  ponerLlamadas: (servidorId: string, llamadas: Llamadas) => void
  limpiar: () => void
}

/** Lo llena el servidor de socket.io (evento servidor:llamadas). */
export const useLlamadasStore = create<LlamadasState>((set) => ({
  porServidor: {},
  ponerLlamadas: (servidorId, llamadas) => set((s) => ({ porServidor: { ...s.porServidor, [servidorId]: llamadas } })),
  limpiar: () => set({ porServidor: {} }),
}))

/** Participantes de un canal de voz (busca en todos los servidores). */
export function enLlamada(canalId: string): ParticipanteLlamada[] {
  for (const llamadas of Object.values(useLlamadasStore.getState().porServidor)) {
    if (llamadas[canalId]) return llamadas[canalId]
  }
  return []
}
