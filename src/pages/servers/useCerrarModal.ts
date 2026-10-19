import { useLocation, useNavigate } from 'react-router'
import { rutas } from '../../lib/routes'

/**
 * Cierra el modal (la X, Escape y el botón "Cancelar"): si se llegó desde otra
 * pantalla regresa a ella; si se abrió el enlace directo, va al Inicio.
 */
export function useCerrarModal() {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key !== 'default' ? navigate(-1) : navigate(rutas.inicio))
}
