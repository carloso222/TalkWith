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
import type { Canal, Grabacion, Invitacion, Mensaje, Miembro, ResumenInicio, ResumenServidor, Servidor, SesionVoz, Usuario } from '../types'

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
  defaultId: (uid: string = db.CURRENT_UID): string => db.miembros.find((m) => m.uid === uid)?.servidorId ?? '',
  /** Canales, personas en llamada y última actividad de un servidor. */
  summary: (id: string): ResumenServidor => db.resumenServidores[id] ?? { canales: 0, enLlamada: 0 },
}

/* ---------- Invitaciones ---------- */
export const inviteService = {
  /** Acepta el enlace completo (talkwith.app/i/codigo) o solo el código. */
  validate: (texto: string): Promise<Invitacion | null> => {
    const codigo = texto.trim().split('/').pop()?.toLowerCase() ?? ''
    return simular(db.invitaciones.find((i) => i.codigo.toLowerCase() === codigo) ?? null)
  },
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
  isMuted: (uid: string): boolean => db.silenciados.includes(uid),
  /** Menciones al usuario en un canal, contadas a partir de los mensajes. */
  mentions: (canalId: string, uid: string = db.CURRENT_UID): number =>
    db.mensajes.filter((m) => m.canalId === canalId && m.menciones?.includes(uid)).length,
  readIds: (): string[] => db.canalesLeidos,
  /** Personas escribiendo ahora mismo en un canal de texto. */
  typing: (canalId: string): string[] => db.escribiendo[canalId] ?? [],
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
  speakingTime: (sesionId: string): Record<string, string> => db.tiempoHablado[sesionId] ?? {},
  /** Total de sesiones del servidor (para la paginación del historial). */
  total: (servidorId: string): number => db.totalSesiones[servidorId] ?? db.sesiones.filter((s) => s.servidorId === servidorId).length,
}

/* ---------- Grabaciones ---------- */
export const recordingService = {
  getByServer: (servidorId: string): Promise<Grabacion[]> => simular(db.grabaciones.filter((g) => g.servidorId === servidorId)),
  getBySession: (sesionId: string) => simular(db.grabaciones.find((g) => g.sesionId === sesionId) ?? null),
  /** No borra nada: la entrega pide solo mostrar la confirmación. */
  remove: (_grabacionId: string) => simular(true),
}

/* ---------- Inicio y búsqueda ---------- */
export const activityService = {
  getRecent: () => simular(db.actividad),
}

/** Quita acentos y pasa a minúsculas conservando la longitud del texto. */
export const normalizar = (s: string) => Array.from(s, (ch) => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()).join('')

/** Palabras con significado de una consulta ("permisos del micrófono" → permisos, microfono). */
export const terminos = (q: string) =>
  normalizar(q)
    .split(/\s+/)
    .filter((w) => w.length > 3)

export const searchService = {
  /** Búsqueda simulada sobre mensajes y transcripciones, ordenada por relevancia. */
  search: (q: string) => {
    const palabras = terminos(q)
    if (!palabras.length) return simular([] as typeof db.resultadosBusqueda)
    const puntuados = db.resultadosBusqueda
      .map((r) => {
        const texto = normalizar(r.fragmento)
        return { r, puntos: palabras.filter((w) => texto.includes(w)).length }
      })
      .filter((x) => x.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos)
    return simular(puntuados.map((x) => x.r))
  },
}

/* ---------- Resumen de Inicio ---------- */
export const dashboardService = {
  getResumen: (uid: string = db.CURRENT_UID): Promise<ResumenInicio> => {
    const ids = db.miembros.filter((m) => m.uid === uid).map((m) => m.servidorId)
    const canal = db.canales.find(
      (c) => c.tipo === 'voz' && ids.includes(c.servidorId) && (db.enLlamada[c.canalId]?.length ?? 0) > 0,
    )
    let llamada: ResumenInicio['llamada'] = null
    if (canal) {
      const segs = db.segmentos.filter((g) => g.sesionId === db.sesionEnVivo[canal.canalId])
      const ultimo = segs[segs.length - 1]
      llamada = {
        servidorId: canal.servidorId,
        canalId: canal.canalId,
        canalNombre: canal.nombre,
        participantes: db.enLlamada[canal.canalId],
        subtitulo: ultimo ? { hablanteUid: ultimo.hablanteUid, texto: ultimo.texto } : undefined,
      }
    }
    const sesionesNuevas = db.sesiones.filter((s) => ids.includes(s.servidorId) && /^(Hoy|Ayer)/.test(s.inicio)).length
    return simular({ llamada, sesionesNuevas, servidorId: llamada?.servidorId ?? ids[0] ?? '' })
  },
}
