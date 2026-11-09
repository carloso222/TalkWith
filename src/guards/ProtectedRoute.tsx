import { Navigate, Outlet, useLocation } from 'react-router'
import { rutas } from '../lib/routes'
import { useAuthStore } from '../store/authStore'
import { useDatosStore } from '../store/datosStore'
import PantallaCarga from './PantallaCarga'

/**
 * Guardia de autenticación: sin sesión → /login (y recuerda a dónde iba);
 * con sesión pero sin perfil completo → /registro;
 * con perfil completo espera a que lleguen los primeros datos de Firestore.
 */
export default function ProtectedRoute() {
  const estado = useAuthStore((s) => s.estado)
  const perfilCompleto = useAuthStore((s) => s.perfilCompleto)
  const datos = useDatosStore((s) => s.estado)
  const location = useLocation()
  if (estado === 'cargando') return <PantallaCarga />
  if (estado === 'anonimo') return <Navigate to={rutas.login} replace state={{ from: location.pathname }} />
  if (!perfilCompleto) return <Navigate to={rutas.registro} replace />
  if (datos === 'inactivo' || datos === 'cargando') return <PantallaCarga />
  return <Outlet />
}
