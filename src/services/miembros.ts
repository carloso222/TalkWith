import { deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { puedeCambiarRol, puedeRetirar, puedeSalir } from '../lib/permisos'
import { useDatosStore } from '../store/datosStore'
import type { Miembro, Rol } from '../types'
import { ApiError } from './errores'
import { aApiError } from './firestore/errores'
import { rolEn, uidDe } from './firestore/vistas'

const SIN_PERMISO = 'No tienes permiso para hacer esto.'

function objetivoDe(servidorId: string, uid: string): Miembro {
  const objetivo = useDatosStore.getState().miembros[servidorId]?.[uid]
  if (!objetivo) throw new ApiError(404, 'Esa persona ya no es miembro del servidor.')
  return objetivo
}

async function escribir(operacion: () => Promise<void>): Promise<void> {
  try {
    await operacion()
  } catch (e) {
    throw aApiError(e)
  }
}

export const memberService = {
  getByServer: (servidorId: string): Promise<Miembro[]> => {
    const miembros = Object.values(useDatosStore.getState().miembros[servidorId] ?? {})
    return Promise.resolve(miembros.sort((a, b) => a.unidoEn.localeCompare(b.unidoEn) || a.uid.localeCompare(b.uid)))
  },
  /** Rol del usuario actual en un servidor, o null si no es miembro. */
  roleOf: (servidorId: string, uid?: string): Rol | null => rolEn(servidorId, uidDe(uid)),
  isMember: (servidorId: string, uid?: string): boolean => rolEn(servidorId, uidDe(uid)) !== null,

  /** El propietario asigna «admin» o «miembro» a otra persona. */
  setRole: async (servidorId: string, uid: string, rol: 'admin' | 'miembro'): Promise<void> => {
    const yo = uidDe()
    if (!puedeCambiarRol(rolEn(servidorId, yo), yo, objetivoDe(servidorId, uid))) throw new ApiError(403, SIN_PERMISO)
    await escribir(() => updateDoc(doc(db, 'servidores', servidorId, 'miembros', uid), { rol }))
  },
  /** Retira a otra persona del servidor (el propietario a cualquiera, el admin solo a miembros). */
  remove: async (servidorId: string, uid: string): Promise<void> => {
    const yo = uidDe()
    if (!puedeRetirar(rolEn(servidorId, yo), yo, objetivoDe(servidorId, uid))) throw new ApiError(403, SIN_PERMISO)
    await escribir(() => deleteDoc(doc(db, 'servidores', servidorId, 'miembros', uid)))
  },
  /** El usuario actual sale del servidor (la persona propietaria no puede). */
  leave: async (servidorId: string): Promise<void> => {
    const yo = uidDe()
    if (!puedeSalir(rolEn(servidorId, yo))) throw new ApiError(403, SIN_PERMISO)
    await escribir(() => deleteDoc(doc(db, 'servidores', servidorId, 'miembros', yo)))
  },
}
