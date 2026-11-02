import { Captions, Clock, Headphones, MoreHorizontal, PanelRight, SignalHigh } from 'lucide-react'
import { cn } from '../../lib/cn'

interface Props {
  nombre: string
  tiempo: string
  subtitulos: boolean
  onSubtitulos: () => void
  panelAbierto: boolean
  onPanel: () => void
}

const botonIcono = 'rounded-lg p-2 text-muted transition-colors hover:bg-raised hover:text-fg'

/** Encabezado de la sala: nombre, estado de conexión, cronómetro y atajos (Figma 12). */
export default function CallHeader({ nombre, tiempo, subtitulos, onSubtitulos, panelAbierto, onPanel }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Headphones className="size-[18px] shrink-0 text-muted" />
        <h1 className="truncate text-subtitle font-semibold">{nombre}</h1>
        <span className="flex items-center gap-1.5 rounded-full bg-online/15 px-2.5 py-0.5 text-caption font-medium text-online">
          <span className="size-1.5 rounded-full bg-online" />
          Conectado
        </span>
        <span className="h-4 w-px bg-line" aria-hidden />
        <span className="flex items-center gap-1.5 text-small tabular-nums" aria-label="Duración de la llamada">
          <Clock className="size-4 text-muted" />
          {tiempo}
        </span>
        <span className="hidden items-center gap-1.5 text-caption text-muted sm:flex">
          <SignalHigh className="size-3.5 text-online" />
          Red estable
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={onSubtitulos} aria-pressed={subtitulos} aria-label="Subtítulos en pantalla" title="Subtítulos" className={cn(botonIcono, subtitulos && 'bg-raised text-fg')}>
          <Captions className="size-[18px]" />
        </button>
        <button onClick={onPanel} aria-pressed={panelAbierto} aria-label="Panel de transcripción" title="Transcripción" className={cn(botonIcono, panelAbierto && 'bg-raised text-fg')}>
          <PanelRight className="size-[18px]" />
        </button>
        <button className={botonIcono} aria-label="Más opciones" title="Más opciones">
          <MoreHorizontal className="size-[18px]" />
        </button>
      </div>
    </header>
  )
}