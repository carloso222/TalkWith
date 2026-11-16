import { House, LayoutGrid, Search, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import UserPanel from './UserPanel'

const enlaces: { to: string; texto: string; icono: LucideIcon; end?: boolean }[] = [
  { to: rutas.inicio, texto: 'Inicio', icono: House, end: true },
  { to: rutas.servidores, texto: 'Tus servidores', icono: LayoutGrid },
  { to: rutas.buscar(), texto: 'Buscar', icono: Search },
]

/**
 * Columna de 260 px fuera de un servidor (Inicio, Tus servidores, Búsqueda, Perfil).
 * Antes se pintaban los canales del primer servidor y parecía que seguías dentro de él.
 */
export default function HomeSidebar() {
  return (
    <aside className="flex w-[260px] shrink-0 flex-col bg-panel">
      <header className="flex h-14 items-center border-b border-line px-4">
        <h2 className="truncate text-subtitle font-semibold">Inicio</h2>
      </header>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-2 py-4">
        {enlaces.map(({ to, texto, icono: Icono, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('flex h-9 items-center gap-2 rounded-lg px-2 text-body text-muted hover:bg-raised hover:text-fg', isActive && 'bg-raised font-medium text-fg')}>
            <Icono className="size-[18px] shrink-0" />
            <span className="truncate">{texto}</span>
          </NavLink>
        ))}
      </nav>

      <UserPanel />
    </aside>
  )
}
