import { useParams } from 'react-router'
import { memberService } from '../services'
import { useAuthStore } from '../store/authStore'
import { useDatosStore } from '../store/datosStore'
import type { Rol } from '../types'

/** Rol del usuario en el servidor de la URL (el rol de demo solo se respeta en desarrollo). */
export function useCurrentRole(serverIdOverride?: string): Rol | null {
  const params = useParams()
  const serverId = serverIdOverride ?? params.serverId
  const rolDemo = useAuthStore((s) => s.rolDemo)
  const uid = useAuthStore((s) => s.usuario?.uid)
  // se suscribe a la caché: si cambia el rol en Firestore, se vuelve a pintar
  useDatosStore((s) => s.version)
  if (import.meta.env.DEV && rolDemo) return rolDemo
  if (!serverId || !uid) return null
  return memberService.roleOf(serverId, uid)
}
