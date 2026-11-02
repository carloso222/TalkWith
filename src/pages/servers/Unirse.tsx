import { AlertCircle, Check, Headphones, Info, Link2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import Button from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import ServerIcon from '../../components/ui/ServerIcon'
import { useDebounce } from '../../hooks/useDebounce'
import { useService } from '../../hooks/useService'
import { rutas } from '../../lib/routes'
import { channelService, inviteService, memberService, mensajeDeError, serverService, userService } from '../../services'
import { useUiStore } from '../../store/uiStore'
import ModalServidor from './ModalServidor'
import { useCerrarModal } from './useCerrarModal'

/** Figma 08 · Unirse con invitación. Responsable: Isaian. Prueba con talkwith.app/i/arte-digital-5MZ8 */
export default function Unirse() {
  const navigate = useNavigate()
  const cerrar = useCerrarModal()
  const notify = useUiStore((s) => s.notify)

  const [enlace, setEnlace] = useState('')
  const consulta = useDebounce(enlace.trim(), 300)
  const { data: invitacion, loading } = useService(() => inviteService.validate(consulta), [consulta])

  const listo = !loading && consulta === enlace.trim()
  const servidor = invitacion ? serverService.find(invitacion.servidorId) : undefined
  const valida = listo && Boolean(servidor)
  const invalida = listo && consulta !== '' && !servidor
  const yaEsMiembro = servidor ? memberService.isMember(servidor.servidorId) : false

  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')

  const irAlServidor = (servidorId: string) => {
    const primerCanal = channelService.listByServer(servidorId)[0]?.canalId ?? 'general'
    navigate(rutas.canal(servidorId, primerCanal))
  }

  const unirse = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!valida || !servidor) return

    // si ya es miembro solo lo llevamos al servidor
    if (yaEsMiembro) {
      irAlServidor(servidor.servidorId)
      return
    }

    setEnviando(true)
    setErrorEnvio('')
    try {
      const unido = await inviteService.join(enlace)
      notify('exito', `Te uniste a ${unido.nombre}`, `Ahora son ${unido.totalMiembros} miembros.`)
      irAlServidor(unido.servidorId)
    } catch (err) {
      setErrorEnvio(mensajeDeError(err))
      setEnviando(false)
    }
  }

  return (
    <ModalServidor
      pestana="unirse"
      titulo="Únete a un servidor"
      descripcion="Pega el enlace o el código que te compartieron para entrar a una comunidad existente."
      icono={<Link2 className="size-6" />}
      acciones={
        <>
          <Button variant="secundario" onClick={cerrar} disabled={enviando}>Cancelar</Button>
          <Button onClick={() => unirse()} disabled={!valida} loading={enviando}>
            {enviando ? 'Uniéndote…' : yaEsMiembro ? 'Ir al servidor' : 'Unirme al servidor'}
          </Button>
        </>
      }
    >
      <form onSubmit={unirse} className="flex flex-col gap-3">
        <Field
          label="Enlace o código de invitación"
          placeholder="talkwith.app/i/club-lectura-7KD2"
          icon={<Link2 className="size-[18px]" />}
          value={enlace}
          onChange={(e) => {
            setEnlace(e.target.value)
            setErrorEnvio('')
          }}
          error={invalida ? 'El enlace no es válido o ya expiró. Pide uno nuevo a quien te invitó.' : errorEnvio || undefined}
          disabled={enviando}
          autoFocus
        />
        {valida && invitacion && !errorEnvio && (
          <p className="flex items-center gap-1.5 text-caption text-online">
            <Check className="size-3.5" /> Invitación válida · expira en {invitacion.expiraEn}
            {yaEsMiembro && <span className="text-muted">· ya eres miembro</span>}
          </p>
        )}
        {!enlace && (
          <p className="flex items-center gap-1.5 text-caption text-muted">
            <AlertCircle className="size-3.5" /> Prueba con talkwith.app/i/arte-digital-5MZ8
          </p>
        )}

        {valida && servidor && invitacion && (
          <div className="mt-2 flex items-center gap-4 rounded-xl border border-line bg-base/60 p-4">
            <ServerIcon servidor={servidor} size={56} />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-subtitle font-semibold">{servidor.nombre}</p>
              <p className="text-small text-muted">Te invita {userService.find(invitacion.invitaUid)?.nombre}</p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption font-medium">
                <span className="flex items-center gap-1.5 text-muted"><Users className="size-3.5" /> {servidor.totalMiembros} miembros</span>
                <span className="flex items-center gap-1.5 text-muted"><span className="size-2 rounded-full bg-online" /> {invitacion.enLinea} en línea</span>
                <span className="flex items-center gap-1.5 text-voice"><Headphones className="size-3.5" /> {invitacion.enLlamada} en llamada</span>
              </p>
            </div>
          </div>
        )}
      </form>

      <p className="flex gap-2.5 rounded-[10px] bg-raised/70 px-3.5 py-3 text-caption text-muted">
        <Info className="size-4 shrink-0" />
        Al unirte, tu nombre y tu foto serán visibles para los miembros del servidor.
      </p>
    </ModalServidor>
  )
}
