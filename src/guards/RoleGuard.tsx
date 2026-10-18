import { Navigate, Outlet } from 'react-router'
import { useCurrentRole } from '../hooks/useCurrentRole'
import type { Rol } from '../types'

/**
 * Guardia de rol (matriz de autorización, sección 5.2 de la planeación).
 * La configuración del servidor solo la abren propietario y administradores.
 */
export default function RoleGuard({ roles = ['propietario', 'admin'] }: { roles?: Rol[] }) {
  const rol = useCurrentRole()
  if (!rol || !roles.includes(rol)) return <Navigate to="/404" replace state={{ motivo: 'sin-permiso' }} />
  return <Outlet />
}
