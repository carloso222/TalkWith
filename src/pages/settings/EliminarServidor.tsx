import { AlertTriangle, AudioLines, Hash, Lock, Users } from 'lucide-react'
import { useId, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Button from '../../components/ui/Button'
import { useCurrentRole } from '../../hooks/useCurrentRole'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { puedeEliminarServidor } from '../../lib/permisos'
import { rutas } from '../../lib/routes'
import { channelService, memberService, mensajeDeError, serverService, sessionService } from '../../services'
import { useUiStore } from '../../store/uiStore'
import Seccion from './Seccion'

/**
 * Figma 27 · Eliminar servidor. El botón se activa al escribir el nombre exacto y solo
 * la persona propietaria puede usarlo (igual que las reglas de Firestore).
 */
export default function EliminarServidor() {
  const { serverId = '' } = useParams()
  const navigate = useNavigate()
  const notify = useUiStore((s) => s.notify)
  const rol = useCurrentRole()
  const servidor = serverService.find(serverId)
  const idCampo = useId()

  const canales = channelService.listByServer(serverId).length
  const { data: sesiones } = useService(() => sessionService.getByServer(serverId), [serverId])
  const { data: miembros } = useService(() => memberService.getByServer(serverId), [serverId])

  const [confirmacion, setConfirmacion] = useState('')
  const [eliminando, setEliminando] = useState(false)

  // al borrarse, el servidor sale de la caché antes de que termine la navegación
  if (!servidor) return null

  const esPropietario = puedeEliminarServidor(rol)
  const coincide = confirmacion === servidor.nombre

  const eliminar = async () => {
    if (!coincide || !esPropietario || eliminando) return
    setEliminando(true)
    const nombre = servidor.nombre
    // se sale antes de que la escucha quite el servidor; si falla, el servidor vuelve a aparecer
    const borrado = serverService.remove(serverId)
    navigate(rutas.inicio)
    try {
      await borrado
      notify('exito', `${nombre} se eliminó`, 'Sus canales, mensajes y transcripciones ya no están disponibles.')
    } catch (e) {
      notify('error', `No se pudo eliminar ${nombre}`, mensajeDeError(e))
    }
  }

  return (
    <Seccion titulo="Eliminar servidor" descripcion="Antes de continuar, revisa el historial de sesiones por si quieres conservar alguna transcripción.">
      <div className="flex max-w-[746px] flex-col gap-4 rounded-[14px] border border-recording/40 bg-recording/5 p-6">
        <p className="flex items-center gap-2.5 text-subtitle font-semibold text-red-300">
          <AlertTriangle className="size-5 text-recording" /> Esta acción no se puede deshacer
        </p>
        <ul className="flex flex-col gap-2.5 text-body">
          <li className="flex items-center gap-2.5"><Hash className="size-[18px] text-recording" /> Se eliminarán los {canales} canales y todo su historial de mensajes.</li>
          <li className="flex items-center gap-2.5"><AudioLines className="size-[18px] text-recording" /> Se perderán las {sesiones?.length ?? '…'} sesiones de voz y sus transcripciones.</li>
          <li className="flex items-center gap-2.5"><Users className="size-[18px] text-recording" /> Las {miembros?.length ?? '…'} personas miembros perderán el acceso de inmediato.</li>
        </ul>

        {esPropietario ? (
          <>
            <div className="mt-2 flex flex-col gap-2">
              <label htmlFor={idCampo} className="text-small font-medium">
                Escribe <strong className="font-semibold text-red-300">{servidor.nombre}</strong> para confirmar
              </label>
              <input
                id={idCampo}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && eliminar()}
                autoComplete="off"
                disabled={eliminando}
                className={cn(
                  'h-11 rounded-[10px] border bg-raised px-3.5 text-body focus:outline-none focus:ring-1',
                  coincide ? 'border-recording focus:ring-recording' : 'border-recording/60 focus:border-recording focus:ring-recording/60',
                )}
              />
              <p className="text-caption text-muted">El botón se activa cuando el nombre coincide exactamente.</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secundario" onClick={() => navigate(rutas.ajustes(serverId))}>Cancelar</Button>
              <Button variant="peligro" disabled={!coincide || eliminando} onClick={eliminar}>
                {eliminando ? 'Eliminando…' : 'Eliminar servidor definitivamente'}
              </Button>
            </div>
          </>
        ) : (
          <p role="status" className="mt-2 flex items-center gap-2.5 rounded-[10px] bg-raised px-4 py-3 text-small text-muted">
            <Lock className="size-4 shrink-0" /> Solo la persona propietaria del servidor puede eliminarlo.
          </p>
        )}
      </div>
    </Seccion>
  )
}
