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

export const searchService = {
  /** Búsqueda simulada sobre mensajes y transcripciones, ordenada por relevancia. */
  search: (q: string) => {
    const palabras = terminos(q)
    if (!palabras.length) return simular([] as typeof db.resultadosBusqueda)
    const puntuados = deMisServidores(db.resultadosBusqueda)
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
  getResumen: (uid?: string): Promise<ResumenInicio> => {
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
    const sesionesNuevas = db.sesiones.filter((s) => ids.includes(s.servidorId) && /^(Hoy|Ayer)/.test(s.inicio)).length
    return simular({ llamada, sesionesNuevas, servidorId: llamada?.servidorId ?? ids[0] ?? '' })
  },
}
