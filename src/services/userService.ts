import { usuarios } from '../mocks/data'
import { useAuthStore } from '../store/authStore'
import type { Usuario } from '../types'
import { simular } from './simular'

export const userService = {
  getAll: (): Promise<Usuario[]> => simular(usuarios),
  getById: (uid: string): Promise<Usuario | null> => simular(userService.find(uid) ?? null),
  /** Acceso síncrono para pintar avatares y nombres sin estado de carga. */
  find: (uid: string): Usuario | undefined => {
    const sesion = useAuthStore.getState().usuario
    if (sesion && sesion.uid === uid) return sesion
    return usuarios.find((u) => u.uid === uid)
  },
}
