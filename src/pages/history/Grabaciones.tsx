import { Trash2 } from 'lucide-react'
import { useParams } from 'react-router'
import Placeholder from '../../components/feedback/Placeholder'
import Button from '../../components/ui/Button'
import { rutas } from '../../lib/routes'
import { useUiStore } from '../../store/uiStore'

/** Figma 21 · Grabaciones (listado de audios). Responsable: Diego. */
export default function Grabaciones() {
  const { serverId = '' } = useParams()
  const confirm = useUiStore((s) => s.confirm)
  const notify = useUiStore((s) => s.notify)

  // Patrón de confirmación que pide la entrega: se pregunta, pero NO se elimina nada.
  const eliminar = async () => {
    const ok = await confirm({
      titulo: '¿Eliminar la grabación?',
      descripcion: 'Se eliminará el audio de «Revisión del flujo de permisos». La transcripción se conserva.',
      confirmar: 'Eliminar grabación',
      peligro: true,
    })
    if (ok) notify('exito', 'Grabación eliminada', 'Es solo una demostración: no se borró ningún registro.')
  }

  return (
    <Placeholder
      num="21"
      titulo="Grabaciones"
      responsable="Diego"
      descripcion="Resumen (grabaciones, duración, almacenamiento) y tabla con reproductor, quién grabó, consentimiento, tamaño y acciones de descargar o eliminar."
      enlaces={[{ to: rutas.sesion(serverId, 's1'), label: 'Reproducir · Revisión del flujo de permisos' }, { to: rutas.sesiones(serverId), label: 'Historial de sesiones' }]}
    >
      <Button variant="secundario" className="self-start" icon={<Trash2 className="size-4 text-recording" />} onClick={eliminar}>
        Probar confirmación de eliminar
      </Button>
    </Placeholder>
  )
}
