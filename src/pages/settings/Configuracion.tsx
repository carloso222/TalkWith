import { useParams } from 'react-router'
import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'

const secciones = {
  general: { num: '24', titulo: 'Información general', desc: 'Imagen, nombre y descripción del servidor, con barra «Tienes cambios sin guardar».' },
  canales: { num: '25', titulo: 'Canales', desc: 'Lista de canales con orden y permisos, y modal «Crear canal» (texto o voz, privacidad, roles).' },
  miembros: { num: '26', titulo: 'Miembros', desc: 'Tabla de miembros con rol y estado, cambio de rol y confirmación «¿Retirar a Andrés Lozano?».' },
  eliminar: { num: '27', titulo: 'Eliminar servidor', desc: 'Advertencias y confirmación escribiendo el nombre del servidor.' },
}

/** Figma 24–27 · Configuración del servidor. Responsable: Isaian. Protegida por RoleGuard. */
export default function Configuracion({ seccion }: { seccion: keyof typeof secciones }) {
  const { serverId = '' } = useParams()
  const s = secciones[seccion]
  return (
    <Placeholder
      num={s.num}
      titulo={s.titulo}
      responsable="Isaian"
      descripcion={s.desc}
      enlaces={[
        { to: rutas.ajustes(serverId), label: 'Información general' },
        { to: rutas.ajustes(serverId, 'canales'), label: 'Canales' },
        { to: rutas.ajustes(serverId, 'miembros'), label: 'Miembros' },
        { to: rutas.grabaciones(serverId), label: 'Grabaciones' },
        { to: rutas.ajustes(serverId, 'eliminar'), label: 'Eliminar servidor' },
        { to: rutas.inicio, label: 'Cerrar configuración' },
      ]}
    />
  )
}
