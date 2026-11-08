import { CURRENT_UID } from '../mocks/data'
import { useAuthStore } from '../store/authStore'

/**
 * Puente temporal de la Fase 1: los datos de ejemplo están ligados a `CURRENT_UID`.
 * Mientras los servicios no lean de Firestore, la cuenta real de Google se ve con esos datos.
 * Se borra en la Fase 2.
 */
export function uidDeDatos(uid?: string): string {
  const sesion = useAuthStore.getState().usuario?.uid
  if (uid === undefined || uid === sesion) return CURRENT_UID
  return uid
}
