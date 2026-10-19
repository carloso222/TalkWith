import { createBrowserRouter, RouterProvider } from 'react-router'
import AppLayout from '../components/layout/AppLayout'
import GuestRoute from '../guards/GuestRoute'
import MemberGuard from '../guards/MemberGuard'
import ProtectedRoute from '../guards/ProtectedRoute'
import RoleGuard from '../guards/RoleGuard'
import Perfil from '../pages/account/Perfil'
import Login from '../pages/auth/Login'
import Registro from '../pages/auth/Registro'
import Canal from '../pages/channels/Canal'
import Dashboard from '../pages/dashboard/Dashboard'
import DetalleSesion from '../pages/history/DetalleSesion'
import Grabaciones from '../pages/history/Grabaciones'
import Sesiones from '../pages/history/Sesiones'
import Landing from '../pages/public/Landing'
import NotFound from '../pages/public/NotFound'
import Busqueda from '../pages/search/Busqueda'
import CrearServidor from '../pages/servers/CrearServidor'
import Servidores from '../pages/servers/Servidores'
import Unirse from '../pages/servers/Unirse'
import Configuracion from '../pages/settings/Configuracion'

/**
 * Mapa de rutas ↔ pantallas del Figma (01–29).
 *
 *  Pública ............ /                         01 Landing
 *  GuestRoute ......... /login                    02–03 Inicio de sesión
 *                       /registro                 04 Registro
 *  ProtectedRoute ..... /app                      05 Inicio
 *                       /app/servidores           06 Tus servidores
 *                       /app/servidores/nuevo     07, 09 Crear servidor + toasts
 *                       /app/unirse               08 Unirse con invitación
 *                       /app/buscar               22–23 Búsqueda
 *                       /app/perfil               28 Perfil
 *  + MemberGuard ...... /app/s/:id/c/:canal       10–11 Texto · 12–16 Voz
 *                       /app/s/:id/sesiones       17 Historial
 *                       /app/s/:id/sesiones/:s    18–20 Detalle de sesión
 *                       /app/s/:id/grabaciones    21 Grabaciones
 *  + RoleGuard ........ /app/s/:id/ajustes/...    24–27 Configuración (pantalla completa)
 *  Cualquier otra ..... *                         29 No encontrada
 */
const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/registro', element: <Registro /> },
    ],
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'servidores', element: <Servidores /> },
          { path: 'servidores/nuevo', element: <CrearServidor /> },
          { path: 'unirse', element: <Unirse /> },
          { path: 'buscar', element: <Busqueda /> },
          { path: 'perfil', element: <Perfil /> },
          {
            path: 's/:serverId',
            element: <MemberGuard />,
            children: [
              { path: 'c/:channelId', element: <Canal /> },
              { path: 'sesiones', element: <Sesiones /> },
              { path: 'sesiones/:sessionId', element: <DetalleSesion /> },
              { path: 'grabaciones', element: <Grabaciones /> },
            ],
          },
        ],
      },
      {
        // La configuración ocupa toda la pantalla (Figma 24–27), sin barra de servidores.
        path: 's/:serverId/ajustes',
        element: <MemberGuard />,
        children: [
          {
            element: <RoleGuard roles={['propietario', 'admin']} />,
            children: [
              { index: true, element: <Configuracion seccion="general" /> },
              { path: 'canales', element: <Configuracion seccion="canales" /> },
              { path: 'miembros', element: <Configuracion seccion="miembros" /> },
              { path: 'eliminar', element: <Configuracion seccion="eliminar" /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}
