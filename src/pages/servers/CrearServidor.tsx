import { useNavigate } from 'react-router'
import Placeholder from '../../components/feedback/Placeholder'
import Button from '../../components/ui/Button'
import { rutas } from '../../lib/routes'
import { useUiStore } from '../../store/uiStore'

/** Figma 07 · Crear servidor y 09 · Notificaciones. Responsable: Isaian. */
export default function CrearServidor() {
  const notify = useUiStore((s) => s.notify)
  const navigate = useNavigate()
  return (
    <Placeholder
      num={['07', '09']}
      titulo="Crea tu servidor"
      responsable="Isaian"
      descripcion="Modal con pestañas Crear / Unirme, imagen, nombre, descripción y privacidad. Al crear se muestra el toast de éxito (no se guarda nada)."
      enlaces={[{ to: rutas.unirse, label: 'Unirme con invitación' }, { to: rutas.inicio, label: 'Cancelar' }]}
    >
      <Button className="self-start" onClick={() => { notify('exito', 'Servidor creado correctamente', 'Club de Diseño UX ya está listo. Invita a tu equipo para empezar.'); navigate(rutas.inicio) }}>
        Crear servidor
      </Button>
    </Placeholder>
  )
}
