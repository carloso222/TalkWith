import { Check, Clock, Info, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import type { EstadosConsentimiento } from '../../hooks/useRecordingFlow'
import { userService } from '../../services'
import type { EstadoConsentimiento } from '../../types'
import Avatar from '../../components/ui/Avatar'

interface Props {
  /** 'solicitante': yo pedí grabar (Figma 14). 'participante': me lo piden a mí (Figma 15). */
  modo: 'solicitante' | 'participante'
  yoUid: string
  solicitanteUid: string
  participantes: string[]
  estados: EstadosConsentimiento
  onCancelar: () => void
  onAceptar: () => void
  onRechazar: () => void
  onCerrar: () => void
}

const insignias: Record<EstadoConsentimiento, { texto: string; clase: string; icono: typeof Check }> = {
  aceptado: { texto: 'Aceptado', clase: 'bg-online/15 text-online', icono: Check },
  rechazado: { texto: 'Rechazado', clase: 'bg-recording/15 text-recording', icono: X },
  pendiente: { texto: 'Pendiente', clase: 'bg-warning/15 text-warning', icono: Clock },
}

const primerNombre = (uid: string) => userService.find(uid)?.nombre.split(' ')[0] ?? ''
const unir = (nombres: string[]) => (nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}` : nombres[0])

/** Diálogo de consentimiento para grabar (Figma 14 y 15). */
export default function RecordingDialog({ modo, yoUid, solicitanteUid, participantes, estados, onCancelar, onAceptar, onRechazar, onCerrar }: Props) {
  const botonPrincipal = useRef<HTMLButtonElement>(null)
  useEffect(() => botonPrincipal.current?.focus(), [])

  const orden = [solicitanteUid, ...participantes.filter((u) => u !== solicitanteUid)]
  const otros = orden.filter((u) => u !== yoUid)
  const rechazaron = otros.filter((u) => estados[u] === 'rechazado').map(primerNombre)
  const pendientes = otros.filter((u) => estados[u] === 'pendiente').map(primerNombre)

  let nota: string
  if (modo === 'participante') {
    nota = 'La grabación no comenzará mientras alguien no responda o la rechace.'
  } else {
    const partes: string[] = []
    if (rechazaron.length) partes.push(`${unir(rechazaron)} ${rechazaron.length > 1 ? 'rechazaron' : 'rechazó'} la solicitud`)
    if (pendientes.length) partes.push(`${unir(pendientes)} aún ${pendientes.length > 1 ? 'no responden' : 'no responde'}`)
    nota = partes.length ? `${partes.join(' y ')}. La grabación no ha comenzado.` : 'La grabación empezará cuando todas las personas acepten.'
  }

  const yoPendiente = estados[yoUid] === 'pendiente'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-grabacion" className="animate-dialog-in w-full max-w-[440px] rounded-2xl border border-line bg-panel p-6 shadow-high">
        <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-recording/15">
          <span className="size-4 rounded-full border-2 border-recording" />
        </div>
        <h2 id="titulo-grabacion" className="text-subtitle font-semibold">Solicitud de grabación</h2>
        <p className="mt-1 text-small text-muted">
          {modo === 'solicitante' ? (
            'Pediste grabar esta conversación. La grabación empezará cuando todas las personas acepten.'
          ) : (
            <>
              <strong className="font-semibold text-fg">{primerNombre(solicitanteUid)}</strong> quiere grabar esta conversación. El audio se almacenará en el servidor y estará disponible para los participantes autorizados.
            </>
          )}
        </p>

        <ul className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line">
          {orden.map((uid) => {
            const estado = estados[uid] ?? 'pendiente'
            const insignia = insignias[estado]
            const rol = uid === solicitanteUid ? 'Solicitante' : uid === yoUid ? 'Tú' : undefined
            return (
              <li key={uid} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar uid={uid} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-small font-medium">{userService.find(uid)?.nombre}</span>
                  {rol && <span className="text-caption text-muted">{rol}</span>}
                </span>
                <span className={cn('flex items-center gap-1 rounded-md px-2 py-0.5 text-caption font-medium', insignia.clase)}>
                  <insignia.icono className="size-3" />
                  {insignia.texto}
                </span>
              </li>
            )
          })}
        </ul>

        <p className="mt-4 flex gap-2 rounded-lg bg-raised/50 p-3 text-caption text-muted">
          <Info className="mt-px size-3.5 shrink-0" />
          {nota}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          {modo === 'solicitante' ? (
            <button ref={botonPrincipal} onClick={onCancelar} className="rounded-xl border border-line px-4 py-2 text-small font-medium transition-colors hover:bg-raised">
              Cancelar solicitud
            </button>
          ) : yoPendiente ? (
            <>
              <button onClick={onRechazar} className="rounded-xl border border-line px-4 py-2 text-small font-medium transition-colors hover:bg-raised">
                Rechazar
              </button>
              <button ref={botonPrincipal} onClick={onAceptar} className="rounded-xl bg-primary px-4 py-2 text-small font-medium text-white transition-colors hover:bg-primary-active active:bg-primary-active">
                Aceptar grabación
              </button>
            </>
          ) : (
            <button ref={botonPrincipal} onClick={onCerrar} className="rounded-xl border border-line px-4 py-2 text-small font-medium transition-colors hover:bg-raised">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}