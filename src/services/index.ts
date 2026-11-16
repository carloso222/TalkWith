/**
 * Servicios de datos.
 *
 * Servidores, miembros, canales e invitaciones viven en Firestore (cada dominio en su archivo
 * y con las mismas firmas de siempre); el resto sigue leyendo /mocks envuelto en una Promise
 * con un pequeño retardo. Las pantallas no cambian cuando un dominio migra.
 *
 * Úsalos en componentes con el hook `useService` (src/hooks/useService.ts).
 */
import * as db from '../mocks/data'
import { normalizar, terminos } from '../lib/texto'
import type { Grabacion, ResumenInicio } from '../types'
import { servidoresDe, uidDe } from './firestore/vistas'
import { sessionService } from './sesiones'
import { simular } from './simular'

export { ApiError, manejarError, mensajeDeError } from './errores'

export { userService } from './userService'
export { serverService } from './servidores'
export { memberService } from './miembros'
export { channelService } from './canales'
export { enlaceInvitacion, inviteService } from './invitaciones'
// sesiones de voz y transcripciones en firestore (TW 17)
export { sessionService } from './sesiones'
// historial de mensajes en firestore; los nuevos llegan por socket.io (TW 09)
export { messageService } from './mensajes'
export { searchService } from './busqueda'
export { normalizar, terminos }


/* ---------- Grabaciones ---------- */
export const recordingService = {
  getByServer: (servidorId: string): Promise<Grabacion[]> => simular(db.grabaciones.filter((g) => g.servidorId === servidorId)),
  getBySession: (sesionId: string) => simular(db.grabaciones.find((g) => g.sesionId === sesionId) ?? null),
  /** No borra nada: la entrega pide solo mostrar la confirmación. */
  remove: (_grabacionId: string) => simular(true),
}

/* ---------- Inicio y búsqueda ---------- */

/** Solo deja los resultados de ejemplo cuya ruta apunta a un servidor del que soy miembro. */
const deMisServidores = <T extends { ruta: string }>(items: T[]): T[] => {
  const ids = servidoresDe(uidDe()).map((s) => s.servidorId)
  return items.filter((i) => ids.some((id) => i.ruta.startsWith(`/app/s/${id}/`)))
}

export const activityService = {
  getRecent: () => simular(deMisServidores(db.actividad)),
}

/* ---------- Resumen de Inicio ---------- */

/** Medianoche de ayer: Inicio cuenta como nuevas las transcripciones de hoy y de ayer. */
function inicioDeAyer(ahora = new Date()): Date {
  const d = new Date(ahora)
  d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export const dashboardService = {
  getResumen: async (uid?: string): Promise<ResumenInicio> => {
    const ids = servidoresDe(uidDe(uid)).map((s) => s.servidorId)
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
    // transcripciones reales de todos mis servidores (antes salian de los mocks)
    const recientes = await sessionService.getRecientes(ids, inicioDeAyer()).catch(() => [])
    return {
      llamada,
      sesionesNuevas: recientes.length,
      recientes,
      // el acceso rapido lleva al servidor con la transcripcion mas reciente, no siempre al primero
      servidorId: llamada?.servidorId ?? recientes[0]?.servidorId ?? ids[0] ?? '',
    }
  },
}
