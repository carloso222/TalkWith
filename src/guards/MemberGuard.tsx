import { Navigate, Outlet, useParams } from 'react-router'
import { memberService, serverService } from '../services'
import { useAuthStore } from '../store/authStore'

/**
 * Guardia de membresía: /app/s/:serverId/... solo se abre si el servidor existe
 * y el usuario pertenece a él. Si no, muestra la página 404 / acceso denegado.
 */
export default function MemberGuard() {
  const { serverId = '' } = useParams()
  const uid = useAuthStore((s) => s.usuario?.uid)
  const existe = Boolean(serverService.find(serverId))
  const esMiembro = uid ? memberService.roleOf(serverId, uid) !== null : false
  if (!existe || !esMiembro) return <Navigate to="/404" replace state={{ motivo: 'no-miembro' }} />
  return <Outlet />
}
