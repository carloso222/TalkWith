import { useNavigate } from 'react-router'
import Placeholder from '../../components/feedback/Placeholder'
import Button from '../../components/ui/Button'
import { rutas } from '../../lib/routes'
import { useAuthStore } from '../../store/authStore'

/** Figma 28 · Perfil. Responsable: Carlos. */
export default function Perfil() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  return (
    <Placeholder
      num="28"
      titulo="Tu perfil"
      responsable="Carlos"
      descripcion="Tarjeta de usuario con cerrar sesión, información personal, preferencias de subtítulos (idioma, tamaño) y notificaciones."
      enlaces={[{ to: rutas.inicio, label: 'Guardar cambios' }]}
    >
      <Button variant="secundario" className="self-start" onClick={() => { logout(); navigate(rutas.login) }}>Cerrar sesión</Button>
    </Placeholder>
  )
}
