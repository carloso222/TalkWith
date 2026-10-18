import { Compass, Link2, ShieldAlert } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import Button from '../../components/ui/Button'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rutas } from '../../lib/routes'
import { Halos } from '../auth/Login'

/**
 * Figma 29 · Página no encontrada. Responsable: Diego (versión base funcional).
 * Las guardias redirigen aquí con state.motivo = 'sin-permiso' | 'no-miembro'.
 */
export default function NotFound() {
  const { state, pathname } = useLocation()
  const navigate = useNavigate()
  const sinPermiso = (state as { motivo?: string } | null)?.motivo === 'sin-permiso'
  useDocumentTitle(sinPermiso ? 'Acceso denegado' : 'Página no encontrada')

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center gap-5 overflow-hidden px-4 text-center">
      <Halos />
      <span className="relative flex size-[72px] items-center justify-center rounded-[20px] border border-line bg-panel">
        {sinPermiso ? <ShieldAlert className="size-8 text-warning" /> : <Compass className="size-8 text-primary" />}
      </span>
      <p className={`relative text-8xl font-bold ${sinPermiso ? 'text-warning' : 'text-primary'}`}>{sinPermiso ? '403' : '404'}</p>
      <h1 className="relative text-title font-bold">{sinPermiso ? 'No tienes permiso para ver esto' : 'No encontramos esta página'}</h1>
      <p className="relative max-w-[460px] text-muted">
        {sinPermiso
          ? 'Solo el propietario y los administradores pueden abrir la configuración del servidor.'
          : 'Puede que el enlace esté roto, que el canal se haya eliminado o que no seas miembro de este servidor.'}
      </p>
      <div className="relative flex gap-3">
        <Button onClick={() => navigate(rutas.inicio)}>Volver al inicio</Button>
        <Button variant="secundario" onClick={() => navigate(rutas.servidores)}>Ver mis servidores</Button>
      </div>
      {pathname !== '/404' && (
        <p className="relative flex items-center gap-2 rounded-[10px] border border-line bg-panel px-3 py-2 text-caption text-muted">
          <Link2 className="size-3.5" /> talkwith.app{pathname}
        </p>
      )}
    </div>
  )
}
