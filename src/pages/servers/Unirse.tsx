import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'

/** Figma 08 · Unirse con invitación. Responsable: Isaian. */
export default function Unirse() {
  return (
    <Placeholder
      num="08"
      titulo="Únete a un servidor"
      responsable="Isaian"
      descripcion="Campo de enlace o código, validación, vista previa del servidor (miembros, en línea, en llamada) y aviso de privacidad."
      enlaces={[{ to: rutas.crearServidor, label: 'Crear servidor' }, { to: rutas.inicio, label: 'Unirme al servidor' }]}
    />
  )
}
