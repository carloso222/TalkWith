import { HeadphoneOff, Headphones, Mic, MicOff, Settings } from 'lucide-react'
import { Link } from 'react-router'
import { rutas } from '../../lib/routes'
import { useAuthStore } from '../../store/authStore'
import { micApagado, useVoiceStore } from '../../store/voiceStore'
import Avatar from '../ui/Avatar'

const claseBoton = 'rounded-lg p-1 text-muted hover:bg-raised hover:text-fg'

/**
 * Usuario actual al pie de la columna de canales. El micrófono y los audífonos
 * controlan la llamada en curso (y se recuerdan para la siguiente), como en Discord.
 */
export default function UserPanel() {
  const usuario = useAuthStore((s) => s.usuario)
  const silenciado = useVoiceStore(micApagado)
  const ensordecido = useVoiceStore((s) => s.ensordecido)
  const alternarSilencio = useVoiceStore((s) => s.alternarSilencio)
  const alternarEnsordecido = useVoiceStore((s) => s.alternarEnsordecido)
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
      <button
        onClick={alternarSilencio}
        className={claseBoton}
        aria-label={silenciado ? 'Activar micrófono' : 'Silenciar micrófono'}
        title={silenciado ? 'Activar micrófono' : 'Silenciar micrófono'}
        aria-pressed={silenciado}
      >
        {silenciado ? <MicOff className="size-[18px] text-recording" /> : <Mic className="size-[18px]" />}
      </button>
      <button
        onClick={alternarEnsordecido}
        className={claseBoton}
        aria-label={ensordecido ? 'Activar audio' : 'Ensordecer'}
        title={ensordecido ? 'Activar audio' : 'Ensordecer (no escuchas a nadie y tu micrófono se apaga)'}
        aria-pressed={ensordecido}
      >
        {ensordecido ? <HeadphoneOff className="size-[18px] text-recording" /> : <Headphones className="size-[18px]" />}
      </button>
      <Link to={rutas.perfil} className={claseBoton} aria-label="Ajustes de usuario" title="Ajustes de usuario"><Settings className="size-[18px]" /></Link>
    </div>
  )
}
