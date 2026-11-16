import { collection, getDocs, limit, orderBy, query, type DocumentSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { horaCorta } from '../lib/time'
import type { Mensaje } from '../types'
import { aApiError } from './firestore/errores'

// el chat carga los ultimos mensajes del canal
const MAX_HISTORIAL = 100

/** Mensaje como lo manda el servidor de socket.io. */
export interface MensajeSocket {
  mensajeId: string
  servidorId: string
  canalId: string
  autorUid: string
  contenido: string
  creadoMs: number
}

/** Edición que reparte el servidor (`mensaje:editado`). */
export interface EdicionSocket {
  mensajeId: string
  servidorId: string
  canalId: string
  contenido: string
  editadoMs: number
}

/** Mensaje borrado que reparte el servidor (`mensaje:borrado`). */
export interface BorradoSocket {
  mensajeId: string
  servidorId: string
  canalId: string
}

const texto = (valor: unknown) => (typeof valor === 'string' ? valor : '')

export function desdeSocket(m: MensajeSocket): Mensaje {
  return { mensajeId: m.mensajeId, canalId: m.canalId, autorUid: m.autorUid, contenido: m.contenido, creadoMs: m.creadoMs, creadoEn: horaCorta(new Date(m.creadoMs)) }
}

function aMensaje(snap: DocumentSnapshot, canalId: string): Mensaje {
  const d = snap.data() ?? {}
  const creadoMs = d.creadoEn?.toMillis ? d.creadoEn.toMillis() : 0
  const editadoMs = d.editadoEn?.toMillis ? d.editadoEn.toMillis() : undefined
  return {
    mensajeId: snap.id,
    canalId,
    autorUid: texto(d.autorUid),
    contenido: texto(d.contenido),
    creadoMs,
    creadoEn: creadoMs ? horaCorta(new Date(creadoMs)) : '',
    ...(editadoMs ? { editadoMs } : {}),
  }
}

/** Ordena por hora y, si empatan, por id (asi todos ven el mismo orden). */
export function ordenarMensajes(mensajes: Mensaje[]): Mensaje[] {
  return [...mensajes].sort((a, b) => (a.creadoMs ?? 0) - (b.creadoMs ?? 0) || a.mensajeId.localeCompare(b.mensajeId))
}

export const messageService = {
  /** Ultimos mensajes del canal, del mas viejo al mas nuevo. */
  getByChannel: async (servidorId: string, canalId: string): Promise<Mensaje[]> => {
    try {
      const ref = collection(db, 'servidores', servidorId, 'canales', canalId, 'mensajes')
      const snap = await getDocs(query(ref, orderBy('creadoEn', 'desc'), limit(MAX_HISTORIAL)))
      return ordenarMensajes(snap.docs.map((d) => aMensaje(d, canalId)))
    } catch (e) {
      throw aApiError(e)
    }
  },
}
