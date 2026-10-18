import { Navigate, Outlet, useLocation } from 'react-router'
import { rutas } from '../lib/routes'
import { useAuthStore } from '../store/authStore'

/** Guardia de autenticación: sin sesión → /login (y recuerda a dónde iba). */
export default function ProtectedRoute() {
  const usuario = useAuthStore((s) => s.usuario)
  const location = useLocation()
  if (!usuario) return <Navigate to={rutas.login} replace state={{ from: location.pathname }} />
  return <Outlet />
}
