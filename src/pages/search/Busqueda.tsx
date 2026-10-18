import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'

/** Figma 22 · Búsqueda global y 23 · Sin resultados. Responsable: Carlos. */
export default function Busqueda() {
  return (
    <Placeholder
      num={['22', '23']}
      titulo="Búsqueda global"
      responsable="Carlos"
      descripcion="Campo con useDebounce, filtros (servidor, canal, tipo, participante, fecha), resultados de mensajes y transcripciones con el término resaltado, y estado sin resultados."
      enlaces={[{ to: rutas.sesion('estudio-diseno', 's1'), label: 'Abrir en contexto (transcripción)' }, { to: rutas.canal('estudio-diseno', 'general'), label: 'Abrir en contexto (#general)' }]}
    />
  )
}
