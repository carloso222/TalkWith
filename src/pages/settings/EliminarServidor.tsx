import { AlertTriangle, AudioLines, Hash, Users } from 'lucide-react'
import { useId, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Button from '../../components/ui/Button'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { channelService, memberService, recordingService, serverService } from '../../services'
import { useUiStore } from '../../store/uiStore'
import Seccion from './Seccion'

/**
 * Figma 27 · Eliminar servidor. El botón se activa al escribir el nombre exacto;
 * al confirmar solo aparece un toast: no se borra nada.
 */
export default function EliminarServidor() {
  const { serverId = '' } = useParams()
  const navigate = useNavigate()
  const notify = useUiStore((s) => s.notify)
  const servidor = serverService.find(serverId)!
  const idCampo = useId()

  const canales = channelService.listByServer(serverId).length
  const { data: grabaciones } = useService(() => recordingService.getByServer(serverId), [serverId])
  const { data: miembros } = useService(() => memberService.getByServer(serverId), [serverId])

  const [confirmacion, setConfirmacion] = useState('')
  const coincide = confirmacion === servidor.nombre

  const eliminar = () => {
    if (!coincide) return
    notify('exito', `${servidor.nombre} se eliminó`, 'Es solo una demostración: no se borró ningún registro.')
    navigate(rutas.inicio)
  }

  return (
    <Seccion titulo="Eliminar servidor" descripcion="Antes de continuar, considera descargar las grabaciones que quieras conservar.">
      <div className="flex max-w-[746px] flex-col gap-4 rounded-[14px] border border-recording/40 bg-recording/5 p-6">
        <p className="flex items-center gap-2.5 text-subtitle font-semibold text-red-300">
          <AlertTriangle className="size-5 text-recording" /> Esta acción no se puede deshacer
        </p>
        <ul className="flex flex-col gap-2.5 text-body">
          <li className="flex items-center gap-2.5"><Hash className="size-[18px] text-recording" /> Se eliminarán los {canales} canales y todo su historial de mensajes.</li>
          <li className="flex items-center gap-2.5"><AudioLines className="size-[18px] text-recording" /> Se borrarán las {grabaciones?.length ?? '…'} grabaciones y sus transcripciones.</li>
          <li className="flex items-center gap-2.5"><Users className="size-[18px] text-recording" /> Las {miembros?.length ?? '…'} personas miembros perderán el acceso de inmediato.</li>
        </ul>

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
            className={cn(
              'h-11 rounded-[10px] border bg-raised px-3.5 text-body focus:outline-none focus:ring-1',
              coincide ? 'border-recording focus:ring-recording' : 'border-recording/60 focus:border-recording focus:ring-recording/60',
            )}
          />
          <p className="text-caption text-muted">El botón se activa cuando el nombre coincide exactamente.</p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secundario" onClick={() => navigate(rutas.ajustes(serverId))}>Cancelar</Button>
          <Button variant="peligro" disabled={!coincide} onClick={eliminar}>Eliminar servidor definitivamente</Button>
        </div>
      </div>
    </Seccion>
  )
}
