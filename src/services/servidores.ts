import { collection, doc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { validarServidor, type DatosServidor } from '../lib/validaciones'
import * as mocks from '../mocks/data'
import { useDatosStore } from '../store/datosStore'
import type { Invitacion, ResumenServidor, Servidor } from '../types'
import { ApiError } from './errores'
import { aApiError } from './firestore/errores'
import { esperarServidor } from './firestore/escuchas'
import { crearIniciales, crearSlug } from './firestore/identificadores'
import { rolEn, servidorDe, servidoresDe, uidDe } from './firestore/vistas'
import { puedeEliminarServidor } from '../lib/permisos'
import { crearCodigo, recordarInvitacion } from './invitaciones'

export { crearIniciales, crearSlug }

const COLORES_SERVIDOR = ['#6366f1', '#ec4899', '#16a34a', '#d97706', '#0ea5e9', '#8b5cf6', '#ef4444']
const VIGENCIA_INVITACION_MS = 7 * 24 * 3_600_000

// revisa los datos igual que lo haria el backend
function revisarServidor(datos: DatosServidor, uid: string): void {
  const errores = validarServidor(datos)
  if (errores.nombre) throw new ApiError(400, errores.nombre, 'nombre')
  if (errores.descripcion) throw new ApiError(400, errores.descripcion, 'descripcion')
  const nombre = datos.nombre.trim().toLowerCase()
  if (servidoresDe(uid).some((s) => s.nombre.toLowerCase() === nombre)) {
    throw new ApiError(409, 'Ya perteneces a un servidor con ese nombre.', 'nombre')
  }
}

export const serverService = {
  getMine: (uid?: string): Promise<Servidor[]> => Promise.resolve(servidoresDe(uidDe(uid))),
  getById: (id: string): Promise<Servidor | null> => Promise.resolve(servidorDe(id) ?? null),
  find: (id: string): Servidor | undefined => servidorDe(id),
  list: (): Servidor[] => Object.keys(useDatosStore.getState().servidores).flatMap((sid) => servidorDe(sid) ?? []),
  defaultId: (uid?: string): string => servidoresDe(uidDe(uid))[0]?.servidorId ?? '',
  /** Canales (de la caché), personas en llamada y última actividad de un servidor. */
  summary: (id: string): ResumenServidor => {
    const resumen = mocks.resumenServidores[id]
    return {
      canales: useDatosStore.getState().canales[id]?.length ?? 0,
      enLlamada: resumen?.enLlamada ?? 0,
      actividad: resumen?.actividad ?? 'Sin actividad todavía',
    }
  },
  /** Crea en un solo batch el servidor, la membresía del dueño, sus canales iniciales y una invitación. */
  create: async (datos: DatosServidor, uid?: string): Promise<{ servidor: Servidor; invitacion: Invitacion }> => {
    const yo = uidDe(uid)
    revisarServidor(datos, yo)
    const nombre = datos.nombre.trim()
    const descripcion = datos.descripcion.trim()
    const sid = doc(collection(db, 'servidores')).id
    const iniciales = crearIniciales(nombre)
    const color = COLORES_SERVIDOR[Object.keys(useDatosStore.getState().servidores).length % COLORES_SERVIDOR.length]
    const codigo = crearCodigo(nombre)

    const batch = writeBatch(db)
    batch.set(doc(db, 'servidores', sid), {
      nombre, descripcion, iniciales, color, propietarioUid: yo, privacidad: datos.privacidad, creadoEn: serverTimestamp(),
    })
    batch.set(doc(db, 'servidores', sid, 'miembros', yo), {
      uid: yo, servidorId: sid, rol: 'propietario', unidoEn: serverTimestamp(), correo: auth.currentUser?.email ?? '',
    })
    batch.set(doc(db, 'servidores', sid, 'canales', `${sid}-general`), {
      servidorId: sid, nombre: 'general', tipo: 'texto', descripcion: 'Conversación general del servidor',
    })
    batch.set(doc(db, 'servidores', sid, 'canales', `${sid}-voz`), { servidorId: sid, nombre: 'Sala de voz', tipo: 'voz' })
    batch.set(doc(db, 'invitaciones', codigo), {
      servidorId: sid,
      invitaUid: yo,
      creadaEn: serverTimestamp(),
      expiraEn: Timestamp.fromMillis(Date.now() + VIGENCIA_INVITACION_MS),
      servidorNombre: nombre,
      servidorIniciales: iniciales,
      servidorColor: color,
    })
    try {
      await batch.commit()
    } catch (e) {
      throw aApiError(e)
    }
    await esperarServidor(sid)
    const invitacion: Invitacion = { codigo, servidorId: sid, invitaUid: yo, expiraEn: '7 días', enLinea: 1, enLlamada: 0 }
    recordarInvitacion(invitacion)
    const servidor = servidorDe(sid) ?? {
      servidorId: sid, nombre, descripcion, iniciales, color, propietarioUid: yo, privacidad: datos.privacidad, totalMiembros: 1,
    }
    return { servidor, invitacion }
  },

  /**
   * Elimina el servidor. En el mismo batch crea la lápida `servidoresEliminados/{sid}`,
   * como piden las reglas, para que el id no se vuelva a usar.
   *
   * Canales, miembros, mensajes y sesiones quedan en Firestore pero nadie los puede leer:
   * las reglas exigen que el servidor exista. Cada cliente lo quita de su caché solo
   * cuando su escucha ve que el documento ya no existe (escuchas.ts).
   */
  remove: async (servidorId: string, uid?: string): Promise<void> => {
    const yo = uidDe(uid)
    if (!servidorDe(servidorId)) throw new ApiError(404, 'El servidor no existe o ya fue eliminado.')
    if (!puedeEliminarServidor(rolEn(servidorId, yo))) throw new ApiError(403, 'Solo la persona propietaria puede eliminar el servidor.')
    const batch = writeBatch(db)
    batch.delete(doc(db, 'servidores', servidorId))
    batch.set(doc(db, 'servidoresEliminados', servidorId), { eliminadoEn: serverTimestamp() })
    try {
      await batch.commit()
    } catch (e) {
      throw aApiError(e)
    }
  },
}
