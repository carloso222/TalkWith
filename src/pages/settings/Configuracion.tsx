import { CircleDot, Hash, Info, Mail, Shield, Trash2, Users, X, type LucideIcon } from 'lucide-react'
import { useCallback } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router'
import ServerIcon from '../../components/ui/ServerIcon'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useHotkey } from '../../hooks/useHotkey'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { channelService, serverService } from '../../services'
import { useUiStore } from '../../store/uiStore'
import Canales from './Canales'
import EliminarServidor from './EliminarServidor'
import General from './General'
import Miembros from './Miembros'

const secciones = {
  general: { titulo: 'Información general', Vista: General },
  canales: { titulo: 'Canales', Vista: Canales },
  miembros: { titulo: 'Miembros', Vista: Miembros },
  eliminar: { titulo: 'Eliminar servidor', Vista: EliminarServidor },
}
export type SeccionConfig = keyof typeof secciones

/**
 * Figma 24–27 · Configuración del servidor. Responsable: Isaian.
 * Ocupa toda la pantalla (sin barra de servidores) y está protegida por RoleGuard.
 */
export default function Configuracion({ seccion }: { seccion: SeccionConfig }) {
  const { serverId = '' } = useParams()
  const navigate = useNavigate()
  const notify = useUiStore((s) => s.notify)
  const servidor = serverService.find(serverId)
  const { titulo, Vista } = secciones[seccion]
  useDocumentTitle(`${titulo} · Configuración`)

  const cerrar = useCallback(() => {
    // Si hay un modal o confirmación abierta, Escape solo cierra ese diálogo.
    if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
    navigate(rutas.canal(serverId, channelService.listByServer(serverId)[0]?.canalId ?? 'general'))
  }, [navigate, serverId])
  useHotkey('Escape', cerrar)

  const proximamente = (que: string) => notify('info', `${que} llegará en la siguiente entrega`, 'Por ahora solo están las vistas de general, canales y miembros.')

  if (!servidor) return null
  return (
    <div className="flex min-h-full items-center justify-center bg-base px-6 py-6 xl:px-[60px]">
      <div className="relative flex h-[min(780px,calc(100vh-48px))] w-full max-w-[1120px] rounded-2xl border border-line bg-panel shadow-high">
        {/* Cerrar: a la derecha del panel en pantallas anchas, dentro de él en las angostas. */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-center gap-1.5 xl:top-0 xl:right-auto xl:left-full xl:ml-5">
          <button onClick={cerrar} className="flex size-10 items-center justify-center rounded-full border border-line bg-base text-muted transition-colors hover:bg-raised hover:text-fg" aria-label="Cerrar configuración">
            <X className="size-5" />
          </button>
          <span className="text-caption text-muted">Esc</span>
        </div>

        <nav aria-label="Secciones de configuración" className="flex w-[264px] shrink-0 flex-col rounded-l-2xl border-r border-line bg-base/40 px-3 pt-6 pb-6">
          <div className="mb-3 flex items-center gap-3 px-2">
            <ServerIcon servidor={servidor} size={40} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-small font-medium">{servidor.nombre}</span>
              <span className="text-caption text-muted">Configuración del servidor</span>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <ItemNav to={rutas.ajustes(serverId)} icono={Info} end>Información general</ItemNav>
            <ItemNav to={rutas.ajustes(serverId, 'canales')} icono={Hash}>Canales</ItemNav>
            <ItemNav to={rutas.ajustes(serverId, 'miembros')} icono={Users}>Miembros</ItemNav>
            <ItemBoton icono={Shield} onClick={() => proximamente('Roles y permisos')}>Roles y permisos</ItemBoton>
            <ItemBoton icono={Mail} onClick={() => proximamente('Invitaciones')}>Invitaciones</ItemBoton>
            <Link to={rutas.grabaciones(serverId)} className={claseItem(false)}>
              <CircleDot className="size-[18px]" /> Grabaciones
            </Link>
          </div>

          <div className="mt-auto border-t border-line pt-3">
            <NavLink to={rutas.ajustes(serverId, 'eliminar')} className={({ isActive }) => cn('flex h-10 items-center gap-3 rounded-lg px-3 text-small text-recording transition-colors hover:bg-recording/10', isActive && 'bg-recording/10 font-medium')}>
              <Trash2 className="size-[18px]" /> Eliminar servidor
            </NavLink>
          </div>
        </nav>

        <section className="min-w-0 flex-1 overflow-hidden rounded-r-2xl">
          <Vista key={seccion} />
        </section>
      </div>
    </div>
  )
}

const claseItem = (activo: boolean) =>
  cn('flex h-10 items-center gap-3 rounded-lg px-3 text-small transition-colors', activo ? 'bg-raised font-medium text-fg' : 'text-muted hover:bg-raised/60 hover:text-fg')

function ItemNav({ to, icono: Icono, end, children }: { to: string; icono: LucideIcon; end?: boolean; children: string }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => claseItem(isActive)}>
      <Icono className="size-[18px]" /> {children}
    </NavLink>
  )
}

function ItemBoton({ icono: Icono, onClick, children }: { icono: LucideIcon; onClick: () => void; children: string }) {
  return (
    <button onClick={onClick} className={claseItem(false)}>
      <Icono className="size-[18px]" /> {children}
    </button>
  )
}
