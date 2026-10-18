/**
 * Servicios de datos.
 *
 * Esta entrega NO hace peticiones a ninguna API: cada función devuelve datos
 * de /mocks envueltos en una Promise con un pequeño retardo, para que las
 * vistas ya se escriban como si los datos vinieran del servidor.
 * En la siguiente entrega solo se reemplaza el cuerpo de estas funciones
 * por llamadas a Firebase / Socket.io; las vistas no cambian.
 *
 * Úsalos en componentes con el hook `useService` (src/hooks/useService.ts).
 */
import * as db from '../mocks/data'
import type { Canal, Grabacion, Mensaje, Miembro, Servidor, SesionVoz, Usuario } from '../types'

const LATENCIA_MS = 250

function simular<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(valor)), LATENCIA_MS))
}

/* ---------- Usuarios ---------- */
export const userService = {
  getAll: () => simular(db.usuarios),
  getById: (uid: string) => simular(db.usuarios.find((u) => u.uid === uid) ?? null),
  /** Acceso síncrono para pintar avatares y nombres sin estado de carga. */
  find: (uid: string): Usuario | undefined => db.usuarios.find((u) => u.uid === uid),
}

/* ---------- Servidores ---------- */
export const serverService = {
  getMine: (uid: string = db.CURRENT_UID): Promise<Servidor[]> => {
    const ids = db.miembros.filter((m) => m.uid === uid).map((m) => m.servidorId)
    return simular(db.servidores.filter((s) => ids.includes(s.servidorId)))
  },
  getById: (id: string) => simular(db.servidores.find((s) => s.servidorId === id) ?? null),
  find: (id: string): Servidor | undefined => db.servidores.find((s) => s.servidorId === id),
  list: (): Servidor[] => db.servidores,
}

/* ---------- Miembros y roles ---------- */
export const memberService = {
  getByServer: (servidorId: string): Promise<Miembro[]> => simular(db.miembros.filter((m) => m.servidorId === servidorId)),
  /** Rol del usuario actual en un servidor, o null si no es miembro. */
  roleOf: (servidorId: string, uid: string = db.CURRENT_UID) =>
    db.miembros.find((m) => m.servidorId === servidorId && m.uid === uid)?.rol ?? null,
}

/* ---------- Canales ---------- */
export const channelService = {
  getByServer: (servidorId: string): Promise<Canal[]> => simular(db.canales.filter((c) => c.servidorId === servidorId)),
  listByServer: (servidorId: string): Canal[] => db.canales.filter((c) => c.servidorId === servidorId),
  find: (canalId: string): Canal | undefined => db.canales.find((c) => c.canalId === canalId),
  inCall: (canalId: string): string[] => db.enLlamada[canalId] ?? [],
}

/* ---------- Mensajes ---------- */
export const messageService = {
  getByChannel: (canalId: string): Promise<Mensaje[]> => simular(db.mensajes.filter((m) => m.canalId === canalId)),
}

/* ---------- Sesiones de voz y transcripciones ---------- */
export const sessionService = {
  getByServer: (servidorId: string): Promise<SesionVoz[]> => simular(db.sesiones.filter((s) => s.servidorId === servidorId)),
  getById: (sesionId: string) => simular(db.sesiones.find((s) => s.sesionId === sesionId) ?? null),
  getSegments: (sesionId: string) => simular(db.segmentos.filter((g) => g.sesionId === sesionId)),
  getConsents: (sesionId: string) => simular(db.consentimientos.filter((c) => c.sesionId === sesionId)),
}

/* ---------- Grabaciones ---------- */
export const recordingService = {
  getByServer: (servidorId: string): Promise<Grabacion[]> => simular(db.grabaciones.filter((g) => g.servidorId === servidorId)),
  /** No borra nada: la entrega pide solo mostrar la confirmación. */
  remove: (_grabacionId: string) => simular(true),
}

/* ---------- Inicio y búsqueda ---------- */
export const activityService = {
  getRecent: () => simular(db.actividad),
}

export const searchService = {
  search: (q: string) => {
    const term = q.trim().toLowerCase()
    if (!term) return simular([] as typeof db.resultadosBusqueda)
    return simular(db.resultadosBusqueda.filter((r) => r.fragmento.toLowerCase().includes(term)))
  },
}
