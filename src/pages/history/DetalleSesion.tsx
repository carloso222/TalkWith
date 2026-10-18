import { useParams } from 'react-router'
import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'

/** Figma 18 · Transcripción, 19 · Grabación y 20 · Confirmar eliminación. Responsable: Carlos. */
export default function DetalleSesion() {
  const { serverId = '', sessionId } = useParams()
  return (
    <Placeholder
      num={['18', '19', '20']}
      titulo={`Sesión ${sessionId}`}
      responsable="Carlos"
      descripcion="Pestañas Transcripción / Grabación, segmentos con autor y hora, buscador dentro de la sesión, reproductor de audio y confirmación «¿Eliminar la grabación?»."
      enlaces={[{ to: rutas.sesiones(serverId), label: 'Volver al historial' }, { to: rutas.canal(serverId, 'sala-principal'), label: 'Volver a Sala principal' }]}
    />
  )
}
