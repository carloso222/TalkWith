import { Plus } from 'lucide-react'
import { NavLink, useParams } from 'react-router'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { channelService, serverService } from '../../services'
import Logo from '../ui/Logo'
import ServerIcon from '../ui/ServerIcon'

/** Columna de 72 px con los servidores del usuario (Figma: "Barra de servidores"). */
export default function ServerBar() {
  const { serverId } = useParams()
  const { data: servidores } = useService(() => serverService.getMine(), [])

  return (
    <nav aria-label="Servidores" className="flex w-[72px] shrink-0 flex-col items-center gap-2 border-r border-line bg-base py-3">
      <NavLink to={rutas.inicio} end title="Inicio" className={({ isActive }) => cn('flex size-12 items-center justify-center rounded-[14px] bg-panel transition-colors hover:bg-raised', isActive && 'bg-raised')}>
        <Logo size={30} />
      </NavLink>
      <span className="my-1 h-0.5 w-8 rounded bg-line" />
      {servidores?.map((s) => {
        const activo = s.servidorId === serverId
        const primerCanal = channelService.listByServer(s.servidorId)[0]?.canalId ?? 'general'
        return (
          <NavLink key={s.servidorId} to={rutas.canal(s.servidorId, primerCanal)} title={s.nombre} className="group relative flex w-full justify-center">
            <span className={cn('absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r bg-fg transition-all', activo ? 'h-10' : 'h-0 group-hover:h-5')} />
            <ServerIcon servidor={s} className={cn('transition-[border-radius]', !activo && 'opacity-80 group-hover:opacity-100')} />
          </NavLink>
        )
      })}
      <NavLink to={rutas.crearServidor} title="Crear o unirse a un servidor" className="flex size-12 items-center justify-center rounded-full bg-panel text-online transition-colors hover:bg-online hover:text-white">
        <Plus className="size-[22px]" />
      </NavLink>
    </nav>
  )
}
