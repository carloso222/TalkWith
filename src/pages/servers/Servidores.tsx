import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'

/** Figma 06 · Tus servidores (listado). Responsable: Isaian. */
export default function Servidores() {
  return (
    <Placeholder
      num="06"
      titulo="Tus servidores"
      responsable="Isaian"
      descripcion="Filtros por rol y cuadrícula de tarjetas con miembros, canales y personas en llamada (usa serverService.getMine())."
      enlaces={[
        { to: rutas.canal('estudio-diseno', 'general'), label: 'Estudio de Diseño' },
        { to: rutas.crearServidor, label: 'Crear servidor' },
        { to: rutas.unirse, label: 'Unirme con invitación' },
      ]}
    />
  )
}
