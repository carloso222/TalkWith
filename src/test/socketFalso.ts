/**
 * Socket.io falso para probar hooks: guarda lo que se emite y deja disparar eventos.
 * Uso: vi.mock('../lib/socket', ...) devolviendo `socketFalso` en obtenerSocket().
 */
type Manejador = (...args: unknown[]) => void

export interface Emitido {
  evento: string
  datos: unknown
  responder?: Manejador
}

export const socketFalso = {
  connected: true,
  active: true,
  manejadores: new Map<string, Set<Manejador>>(),
  emitidos: [] as Emitido[],
  on(evento: string, fn: Manejador) {
    if (!this.manejadores.has(evento)) this.manejadores.set(evento, new Set())
    this.manejadores.get(evento)!.add(fn)
  },
  off(evento: string, fn: Manejador) {
    this.manejadores.get(evento)?.delete(fn)
  },
  emit(evento: string, datos?: unknown, responder?: Manejador) {
    this.emitidos.push({ evento, datos, responder })
  },
  disparar(evento: string, ...args: unknown[]) {
    this.manejadores.get(evento)?.forEach((fn) => fn(...args))
  },
  reiniciar() {
    this.connected = true
    this.active = true
    this.manejadores.clear()
    this.emitidos = []
  },
  /** Lo ultimo que se emitio con ese nombre. */
  ultimo(evento: string): Emitido | undefined {
    return [...this.emitidos].reverse().find((e) => e.evento === evento)
  },
  todos(evento: string): Emitido[] {
    return this.emitidos.filter((e) => e.evento === evento)
  },
}
