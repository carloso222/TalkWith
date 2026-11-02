import { Headphones, Mic, MicOff, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { rutas } from '../../lib/routes'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../ui/Avatar'

/** Usuario actual al pie de la columna de canales. */
export default function UserPanel() {
  const usuario = useAuthStore((s) => s.usuario)
  const [silenciado, setSilenciado] = useState(false)
  const textoEstado = { 'en-linea': 'En línea', ausente: 'Ausente', desconectado: 'Desconectado' }
  if (!usuario) return null
  return (
    <div className="flex h-16 items-center gap-1 border-t border-line bg-base/40 px-3">
      <Link to={rutas.perfil} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 hover:bg-raised">
        <Avatar uid={usuario.uid} size="sm" presencia />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-small font-medium">{usuario.nombre}</span>
          <span className="text-caption text-online">{textoEstado[usuario.estado]}</span>
        </span>
      </Link>
      <button onClick={() => setSilenciado((v) => !v)} className="rounded-lg p-1 text-muted hover:bg-raised hover:text-fg" aria-label={silenciado ? 'Activar micrófono' : 'Silenciar micrófono'} aria-pressed={silenciado}>
        {silenciado ? <MicOff className="size-[18px] text-recording" /> : <Mic className="size-[18px]" />}
      </button>
      <button className="rounded-lg p-1 text-muted hover:bg-raised hover:text-fg" aria-label="Audio"><Headphones className="size-[18px]" /></button>
      <Link to={rutas.perfil} className="rounded-lg p-1 text-muted hover:bg-raised hover:text-fg" aria-label="Ajustes de usuario"><Settings className="size-[18px]" /></Link>
    </div>
  )
}
