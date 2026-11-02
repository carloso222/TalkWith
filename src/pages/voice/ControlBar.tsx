import { Captions, Mic, MicOff, PhoneOff, SlidersHorizontal, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { FaseGrabacion } from '../../hooks/useRecordingFlow'

interface Props {
  silenciado: boolean
  onMic: () => void
  onAjustes: () => void
  subtitulos: boolean
  onSubtitulos: () => void
  onParticipantes: () => void
  fase: FaseGrabacion
  onGrabar: () => void
  onSalir: () => void
}

const base = 'flex size-11 items-center justify-center rounded-full bg-raised text-fg transition-colors hover:bg-line'

function Boton({ label, activo, onClick, className, children }: { label: string; activo?: boolean; onClick: () => void; className?: string; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} aria-pressed={activo} className={cn(base, activo && 'bg-primary/25 ring-1 ring-primary hover:bg-primary/30', className)}>
      {children}
    </button>
  )
}

/** Barra flotante de controles de la llamada (Figma 12–16). */
export default function ControlBar({ silenciado, onMic, onAjustes, subtitulos, onSubtitulos, onParticipantes, fase, onGrabar, onSalir }: Props) {
  const grabando = fase === 'grabando'
  const esperando = fase === 'esperando' || fase === 'respondiendo'
  const etiquetaGrabar = grabando ? 'Detener grabación' : esperando ? 'Ver solicitud de grabación' : 'Grabar la sesión'

  return (
    <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-panel p-2 shadow-high">
      <Boton label={silenciado ? 'Activar micrófono' : 'Silenciar micrófono'} activo={false} onClick={onMic} className={silenciado ? 'bg-recording/15 text-recording hover:bg-recording/25' : undefined}>
        {silenciado ? <MicOff className="size-[18px]" /> : <Mic className="size-[18px]" />}
      </Boton>
      <Boton label="Ajustes de audio" onClick={onAjustes}>
        <SlidersHorizontal className="size-[18px]" />
      </Boton>
      <Boton label="Subtítulos" activo={subtitulos} onClick={onSubtitulos}>
        <Captions className="size-[18px]" />
      </Boton>
      <Boton label="Participantes" onClick={onParticipantes}>
        <Users className="size-[18px]" />
      </Boton>

      <span className="group relative inline-flex">
        <button
          onClick={onGrabar}
          aria-label={etiquetaGrabar}
          aria-pressed={grabando}
          className={cn(base, grabando && 'bg-recording/15 ring-2 ring-recording hover:bg-recording/25', esperando && 'ring-1 ring-warning')}
        >
          <span className={cn('size-[18px] rounded-full', grabando ? 'animate-pulse bg-recording' : 'border-2 border-recording/40')} />
        </button>
        {fase === 'inactiva' && (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 mb-4 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-raised px-3 py-1.5 text-caption text-fg opacity-0 shadow-low transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          >
            Se necesita el consentimiento de todos
          </span>
        )}
      </span>

      <span className="mx-1 h-6 w-px bg-line" aria-hidden />

      <button onClick={onSalir} aria-label="Salir de la llamada" title="Salir de la llamada" className="flex h-11 w-[72px] items-center justify-center rounded-full bg-recording text-white transition-colors hover:bg-recording/85">
        <PhoneOff className="size-5" />
      </button>
    </div>
  )
}