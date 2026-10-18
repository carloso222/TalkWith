import { useParams } from 'react-router'
import { memberService } from '../services'
import { useAuthStore } from '../store/authStore'
import type { Rol } from '../types'

/** Rol del usuario en el servidor de la URL (o el rol de demo si se eligió uno). */
export function useCurrentRole(serverIdOverride?: string): Rol | null {
  const params = useParams()
  const serverId = serverIdOverride ?? params.serverId
  const rolDemo = useAuthStore((s) => s.rolDemo)
  const uid = useAuthStore((s) => s.usuario?.uid)
  if (rolDemo) return rolDemo
  if (!serverId || !uid) return null
  return memberService.roleOf(serverId, uid)
}
