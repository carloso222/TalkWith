import { Navigate, Outlet, useParams } from 'react-router'
import { memberService, serverService } from '../services'
import { useAuthStore } from '../store/authStore'
import { useDatosStore } from '../store/datosStore'
import PantallaCarga from './PantallaCarga'

/**
 * Guardia de membresía: /app/s/:serverId/... solo se abre si el servidor existe
 * y el usuario pertenece a él. Si no, muestra la página 404 / acceso denegado.
 * Mientras llegan los datos de Firestore muestra la pantalla de carga (nunca un 404 falso).
 * Está suscrita a la caché: si me retiran estando dentro, pasa al 404.
 */
export default function MemberGuard() {
  const { serverId = '' } = useParams()
  const uid = useAuthStore((s) => s.usuario?.uid)
  const estado = useDatosStore((s) => s.estado)
  const pendiente = useDatosStore((s) => Boolean(s.pendientes[serverId]))
  useDatosStore((s) => s.version)
  if ((estado !== 'listo' && estado !== 'error') || pendiente) return <PantallaCarga />
  const existe = Boolean(serverService.find(serverId))
  const esMiembro = uid ? memberService.roleOf(serverId, uid) !== null : false
  if (!existe || !esMiembro) return <Navigate to="/404" replace state={{ motivo: 'no-miembro' }} />
  return <Outlet />
}
