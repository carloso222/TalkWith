import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'
import { useDatosStore } from '../store/datosStore'
import type { Usuario } from '../types'
import { aPerfil } from './firestore/convertidores'

/** El correo no está en `usuarios/{uid}`: se toma de cualquier membresía compartida. */
function correoDe(uid: string): string {
  for (const miembros of Object.values(useDatosStore.getState().miembros)) {
    if (miembros[uid]?.correo) return miembros[uid].correo
  }
  return ''
}

function buscar(uid: string): Usuario | undefined {
  const sesion = useAuthStore.getState().usuario
  if (sesion && sesion.uid === uid) return sesion
  const perfil = useDatosStore.getState().perfiles[uid]
  return perfil ? { ...perfil, correo: correoDe(uid) } : undefined
}

export const userService = {
  getAll: (): Promise<Usuario[]> => Promise.resolve(Object.keys(useDatosStore.getState().perfiles).flatMap((uid) => buscar(uid) ?? [])),
  /** Perfil de la caché o, si no está, el de `usuarios/{uid}` (queda guardado en la caché). */
  getById: async (uid: string): Promise<Usuario | null> => {
    const guardado = buscar(uid)
    if (guardado || !uid) return guardado ?? null
    try {
      const snap = await getDoc(doc(db, 'usuarios', uid))
      if (!snap.exists()) return null
      useDatosStore.getState().ponerPerfil(uid, aPerfil(snap))
    } catch {
      return null
    }
    return buscar(uid) ?? null
  },
  /** Acceso síncrono para pintar avatares y nombres sin estado de carga. */
  find: (uid: string): Usuario | undefined => buscar(uid),
}
