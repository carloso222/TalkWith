import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'

/** Figma 05 · Inicio (dashboard). Responsable: Diego. */
export default function Dashboard() {
  return (
    <Placeholder
      num="05"
      titulo="Buenas tardes, Carlos"
      responsable="Diego"
      descripcion="Tarjeta para continuar en Sala principal con subtítulo en vivo, accesos rápidos (transcripciones, búsqueda, crear servidor) y actividad reciente."
      enlaces={[
        { to: rutas.canal('estudio-diseno', 'sala-principal'), label: 'Unirse a la llamada' },
        { to: rutas.sesiones('estudio-diseno'), label: 'Transcripciones recientes' },
        { to: rutas.buscar(), label: 'Buscar conversaciones' },
        { to: rutas.crearServidor, label: 'Crear un servidor' },
        { to: rutas.servidores, label: 'Tus servidores' },
      ]}
    />
  )
}
