import { useNavigate } from 'react-router'
import Placeholder from '../../components/feedback/Placeholder'
import Button from '../../components/ui/Button'
import { rutas } from '../../lib/routes'
import { useAuthStore } from '../../store/authStore'

/** Figma 04 · Registro — completar perfil. Responsable: Carlos. */
export default function Registro() {
  const completarPerfil = useAuthStore((s) => s.completarPerfil)
  const navigate = useNavigate()
  return (
    <div className="min-h-full">
      <Placeholder
        num="04"
        titulo="Completa tu perfil"
        responsable="Carlos"
        descripcion="Foto de Google, nombre visible, nombre de usuario, correo bloqueado y aceptación de términos y de la política de grabación."
        enlaces={[{ to: rutas.login, label: 'Inicia sesión' }, { to: rutas.landing, label: 'Landing' }]}
      >
        <Button className="self-start" onClick={() => { completarPerfil(); navigate(rutas.inicio) }}>Crear mi cuenta</Button>
      </Placeholder>
    </div>
  )
}
