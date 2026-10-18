import { useParams } from 'react-router'
import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'

/** Figma 17 · Historial de sesiones (listado). Responsable: Isaian. */
export default function Sesiones() {
  const { serverId = '' } = useParams()
  return (
    <Placeholder
      num="17"
      titulo="Historial de sesiones"
      responsable="Isaian"
      descripcion="Tabla con canal, fecha, duración, participantes, segmentos y estado de grabación, con filtros y paginación (usa sessionService.getByServer())."
      enlaces={[{ to: rutas.sesion(serverId, 's1'), label: 'Sala principal · Hoy, 16:20' }, { to: rutas.grabaciones(serverId), label: 'Grabaciones' }]}
    />
  )
}
