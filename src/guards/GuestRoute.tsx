import { Navigate, Outlet } from 'react-router'
import { rutas } from '../lib/routes'
import { useAuthStore } from '../store/authStore'

/** Guardia de invitado: si ya hay sesión, /login y /registro mandan al inicio. */
export default function GuestRoute() {
  const usuario = useAuthStore((s) => s.usuario)
  if (usuario) return <Navigate to={rutas.inicio} replace />
  return <Outlet />
}
