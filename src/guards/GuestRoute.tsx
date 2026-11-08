import { Navigate, Outlet, useLocation } from 'react-router'
import { rutas } from '../lib/routes'
import { useAuthStore } from '../store/authStore'
import PantallaCarga from './PantallaCarga'

/**
 * Guardia de invitado para /login y /registro.
 * - /login: con perfil completo manda a donde iba (o al inicio); con perfil incompleto, a /registro.
 * - /registro: exige sesión con perfil incompleto; sin sesión va a /login.
 */
export default function GuestRoute() {
  const estado = useAuthStore((s) => s.estado)
  const perfilCompleto = useAuthStore((s) => s.perfilCompleto)
  const location = useLocation()
  const esRegistro = location.pathname === rutas.registro
  if (estado === 'cargando') return <PantallaCarga />

  if (esRegistro) {
    if (estado === 'anonimo') return <Navigate to={rutas.login} replace />
    if (perfilCompleto) return <Navigate to={rutas.inicio} replace />
    return <Outlet />
  }
  if (estado === 'autenticado') {
    if (!perfilCompleto) return <Navigate to={rutas.registro} replace />
    const destino = (location.state as { from?: string } | null)?.from ?? rutas.inicio
    return <Navigate to={destino} replace />
  }
  return <Outlet />
}
