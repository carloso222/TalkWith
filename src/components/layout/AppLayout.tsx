import { Outlet, useLocation, useParams } from 'react-router'
import { channelService, serverService } from '../../services'
import ChannelSidebar from './ChannelSidebar'
import DemoPanel from './DemoPanel'
import ServerBar from './ServerBar'
import TopBar from './TopBar'

const titulos: [RegExp, string][] = [
  [/^\/app\/?$/, 'Inicio'],
  [/^\/app\/servidores\/nuevo/, 'Crear servidor'],
  [/^\/app\/servidores/, 'Tus servidores'],
  [/^\/app\/unirse/, 'Unirse con invitación'],
  [/^\/app\/buscar/, 'Búsqueda'],
  [/^\/app\/perfil/, 'Tu perfil'],
  [/\/sesiones\/[^/]+/, 'Sesión'],
  [/\/sesiones/, 'Historial de sesiones'],
  [/\/grabaciones/, 'Grabaciones'],
  [/\/ajustes/, 'Configuración'],
]

/**
 * Estructura de la app autenticada: barra de servidores + columna de canales
 * + área principal. Las pantallas de cada integrante se pintan en <Outlet />.
 */
export default function AppLayout() {
  const { serverId, channelId } = useParams()
  const { pathname } = useLocation()
  const servidorActivo = serverId ?? serverService.defaultId()
  const canal = channelId ? channelService.find(channelId) : undefined
  const enCanal = Boolean(canal)

  const seccion = enCanal ? serverService.find(servidorActivo)?.nombre ?? '' : serverId ? serverService.find(serverId)?.nombre ?? '' : 'Inicio'
  const detalle = enCanal ? canal!.nombre : titulos.find(([re]) => re.test(pathname))?.[1]

  return (
    <div className="flex h-full overflow-hidden">
      <ServerBar />
      <ChannelSidebar serverId={servidorActivo} />
      <main className="flex min-w-0 flex-1 flex-col bg-base">
        {/* Los canales dibujan su propio encabezado; el resto usa la barra superior común. */}
        {!enCanal && <TopBar seccion={seccion} detalle={detalle === 'Inicio' ? serverService.find(servidorActivo)?.nombre : detalle} />}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
      <DemoPanel />
    </div>
  )
}
