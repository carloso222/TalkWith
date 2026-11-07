/**
 * Biblioteca de grabaciones de un servidor (pantalla 21).
 * Igual que el resto de servicios: datos de /mocks en una Promise con retardo.
 */
import { grabacionesPorServidor, type BibliotecaGrabaciones } from "../mocks/recordings"

const LATENCIA_MS = 250

const vacia: BibliotecaGrabaciones = {
  resumen: { esteMes: 0, duracionTotal: '0 min', usadoMb: 0, limiteMb: 1024 },
  items: [],
}

export const recordingLibraryService = {
  getByServer: (servidorId: string): Promise<BibliotecaGrabaciones> =>
    new Promise((resolve) => setTimeout(() => resolve(structuredClone(grabacionesPorServidor[servidorId] ?? vacia)), LATENCIA_MS)),
}