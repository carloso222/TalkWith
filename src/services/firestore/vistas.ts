import { useAuthStore } from '../../store/authStore'
import { useDatosStore } from '../../store/datosStore'
import type { Rol, Servidor } from '../../types'

/** Lecturas síncronas de la caché que comparten varios servicios. No consultan Firestore. */

/** `uid` recibido o, por defecto, el de la sesión. */
export const uidDe = (uid?: string): string => uid ?? useAuthStore.getState().usuario?.uid ?? ''

/** Servidor completo de la caché o, si no soy miembro, su vista previa de invitación. */
export function servidorDe(sid: string): Servidor | undefined {
  const { servidores, miembros, previas, pendientes } = useDatosStore.getState()
  const real = servidores[sid]
  if (real && !pendientes[sid]) return { ...real, totalMiembros: Object.keys(miembros[sid] ?? {}).length }
  return previas[sid]
}

/** Mis servidores ya cargados, por fecha de ingreso y luego por nombre. */
export function servidoresDe(uid: string): Servidor[] {
  const { servidores, miembros, pendientes } = useDatosStore.getState()
  return Object.keys(servidores)
    .filter((sid) => !pendientes[sid] && miembros[sid]?.[uid])
    .map((sid) => ({ s: servidorDe(sid)!, unido: miembros[sid][uid].unidoEn }))
    .sort((a, b) => a.unido.localeCompare(b.unido) || a.s.nombre.localeCompare(b.s.nombre, 'es'))
    .map((x) => x.s)
}

/** Rol real (el de Firestore, nunca el de demostración) o null si no soy miembro. */
export const rolEn = (sid: string, uid: string): Rol | null => useDatosStore.getState().miembros[sid]?.[uid]?.rol ?? null
