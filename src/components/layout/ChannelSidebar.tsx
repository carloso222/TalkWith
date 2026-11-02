import { ChevronDown, Hash, Headphones, Lock, MicOff, Plus, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import Can from '../../guards/Can'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { channelService, serverService, userService } from '../../services'
import Avatar from '../ui/Avatar'
import UserPanel from './UserPanel'

/** Columna de canales de 260 px (Figma: "Columna de canales"). */
export default function ChannelSidebar({ serverId }: { serverId: string }) {
  const servidor = serverService.find(serverId)
  const canales = channelService.listByServer(serverId)
  const texto = canales.filter((c) => c.tipo === 'texto')
  const voz = canales.filter((c) => c.tipo === 'voz')

  // Secciones abiertas/cerradas (solo en memoria).
  const [abiertas, setAbiertas] = useState({ texto: true, voz: true })
  const alternar = (k: 'texto' | 'voz') => setAbiertas((a) => ({ ...a, [k]: !a[k] }))
  // Canales cuyas menciones ya se leyeron: arranca con lo que diga el servicio.
  const [vistos, setVistos] = useState<string[]>(() => channelService.readIds())
  const marcarVisto = (id: string) => setVistos((v) => (v.includes(id) ? v : [...v, id]))

  return (
    <aside className="flex w-[260px] shrink-0 flex-col bg-panel">
      <header className="flex h-14 items-center justify-between border-b border-line px-4">
        <h2 className="truncate text-subtitle font-semibold">{servidor?.nombre}</h2>
        <div className="flex items-center gap-0.5 text-muted">
          <button className="rounded-lg p-1.5 hover:bg-raised hover:text-fg" aria-label="Opciones del servidor"><ChevronDown className="size-[18px]" /></button>
          <Can roles={['propietario', 'admin']} serverId={serverId}>
            <Link to={rutas.ajustes(serverId)} className="rounded-lg p-1.5 hover:bg-raised hover:text-fg" aria-label="Configuración del servidor"><Settings className="size-[18px]" /></Link>
          </Can>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2 py-4">
        <Categoria titulo="Canales de texto" serverId={serverId} abierta={abiertas.texto} onToggle={() => alternar('texto')} />
        {abiertas.texto && texto.map((c) => {
          const menciones = vistos.includes(c.canalId) ? 0 : channelService.mentions(c.canalId)
          return (
            <NavLink key={c.canalId} to={rutas.canal(serverId, c.canalId)} onClick={() => marcarVisto(c.canalId)} className={({ isActive }) => cn('flex h-9 items-center gap-2 rounded-lg px-2 text-body text-muted hover:bg-raised hover:text-fg', isActive && 'bg-raised font-medium text-fg')}>
              <Hash className="size-[18px] shrink-0" />
              <span className="flex-1 truncate">{c.nombre}</span>
              {c.privado && <Lock className="size-3.5" />}
              {menciones > 0 && <span className="flex size-[18px] items-center justify-center rounded-full bg-recording text-caption font-semibold text-white">{menciones}</span>}
            </NavLink>
          )
        })}

        <div className="h-4" />
        <Categoria titulo="Canales de voz" serverId={serverId} abierta={abiertas.voz} onToggle={() => alternar('voz')} />
        {abiertas.voz && voz.map((c) => (
          <div key={c.canalId}>
            <NavLink to={rutas.canal(serverId, c.canalId)} className={({ isActive }) => cn('flex h-9 items-center gap-2 rounded-lg px-2 text-body text-muted hover:bg-raised hover:text-fg', isActive && 'bg-raised font-medium text-fg')}>
              <Headphones className="size-[18px] shrink-0" />
              <span className="truncate">{c.nombre}</span>
            </NavLink>
            {channelService.inCall(c.canalId).map((uid) => (
              <div key={uid} className="flex h-[30px] items-center gap-2 pr-2 pl-[34px] text-small text-muted">
                <Avatar uid={uid} size="xs" />
                <span className="flex-1 truncate">{userService.find(uid)?.nombre}</span>
                {channelService.isMuted(uid) && <MicOff className="size-3.5 text-recording" aria-label="Silenciado" />}
              </div>
            ))}
          </div>
        ))}
      </div>

      <UserPanel />
    </aside>
  )
}

function Categoria({ titulo, serverId, abierta, onToggle }: { titulo: string; serverId: string; abierta: boolean; onToggle: () => void }) {
  return (
    <div className="flex h-7 items-center justify-between px-1.5 text-caption font-medium text-muted">
      <button onClick={onToggle} aria-expanded={abierta} className="flex items-center gap-1 rounded hover:text-fg">
        <ChevronDown className={cn('size-3.5 transition-transform', !abierta && '-rotate-90')} />
        {titulo}
      </button>
      <Can roles={['propietario', 'admin']} serverId={serverId}>
        <Link to={rutas.ajustes(serverId, 'canales')} className="rounded p-1 hover:bg-raised hover:text-fg" aria-label={`Crear canal en ${titulo}`}><Plus className="size-4" /></Link>
      </Can>
    </div>
  )
}