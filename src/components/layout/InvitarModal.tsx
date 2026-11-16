import { Check, Copy, RefreshCw, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { enlaceInvitacion, inviteService, mensajeDeError, serverService } from '../../services'
import { useUiStore } from '../../store/uiStore'
import type { Invitacion } from '../../types'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

/**
 * Enlace para invitar personas a un servidor. Reusa la invitación de esta sesión
 * o crea una de 7 días al abrir; "Generar enlace nuevo" crea otra.
 */
export default function InvitarModal({ servidorId, open, onClose }: { servidorId: string; open: boolean; onClose: () => void }) {
  const notify = useUiStore((s) => s.notify)
  const servidor = serverService.find(servidorId)
  const [invitacion, setInvitacion] = useState<Invitacion | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  const crear = async () => {
    setCargando(true)
    setError('')
    setCopiado(false)
    try {
      setInvitacion(await inviteService.create(servidorId))
    } catch (e) {
      setError(mensajeDeError(e))
    } finally {
      setCargando(false)
    }
  }

  // al abrir: la de esta sesión si sigue vigente, si no una nueva
  useEffect(() => {
    if (!open) return
    let activo = true
    inviteService.getByServer(servidorId).then((guardada) => {
      if (!activo) return
      if (guardada) setInvitacion(guardada)
      else void crear()
    })
    return () => {
      activo = false
    }
    // crear depende solo de servidorId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, servidorId])

  const enlace = invitacion ? enlaceInvitacion(invitacion.codigo) : ''

  const copiar = async () => {
    if (!enlace) return
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      notify('info', 'Enlace copiado', 'Compártelo con quien quieras invitar.')
    } catch {
      // sin permiso de portapapeles: se selecciona para copiarlo a mano
      campo.current?.select()
      notify('info', 'Copia el enlace', 'Tu navegador no dejó copiarlo; ya está seleccionado.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      titulo={`Invitar a ${servidor?.nombre ?? 'este servidor'}`}
      descripcion="Cualquiera con el enlace podrá unirse como miembro mientras siga vigente."
      icono={<UserPlus className="size-5" />}
      acciones={<Button variant="secundario" onClick={onClose}>Listo</Button>}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="enlace-invitacion" className="text-small font-medium">Enlace de invitación</label>
        <div className="flex gap-2">
          <input
            id="enlace-invitacion"
            ref={campo}
            readOnly
            value={cargando ? 'Generando enlace…' : enlace}
            onFocus={(e) => e.target.select()}
            className="h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-raised px-3.5 text-small text-fg focus:border-primary focus:outline-none"
          />
          <Button onClick={copiar} disabled={!enlace || cargando} icon={copiado ? <Check className="size-4" /> : <Copy className="size-4" />}>
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-caption text-recording">{error}</p>
        ) : (
          invitacion && !cargando && <p className="text-caption text-muted">Vence en {invitacion.expiraEn}.</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void crear()}
        disabled={cargando}
        className="flex items-center gap-1.5 self-start text-small text-primary hover:underline disabled:opacity-50"
      >
        <RefreshCw className="size-3.5" /> Generar enlace nuevo
      </button>
    </Modal>
  )
}
