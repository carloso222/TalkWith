import { AudioLines, Mic, MicOff, SignalHigh, SignalMedium } from 'lucide-react'
import { cn } from '../../lib/cn'
import { userService } from '../../services'

interface Props {
  uid: string
  esYo?: boolean
  silenciado: boolean
  hablando: boolean
  seleccionado: boolean
  /** Texto del subtítulo que se muestra sobre la etiqueta (si hay). */
  subtitulo?: string
  /** Perdio la conexion y el servidor le guarda el lugar. */
  reconectando?: boolean
}

/** Parte un subtítulo largo en dos tonos: lo reciente arriba, lo anterior atenuado (Figma 12). */
function partirSubtitulo(texto: string): [string, string] {
  const palabras = texto.split(/\s+/)
  if (palabras.length <= 13) return [texto, '']
  const cola = palabras.slice(-13)
  return [`…${cola.slice(0, 6).join(' ')}`, cola.slice(6).join(' ')]
}

/** Tarjeta de una persona en la llamada: avatar grande, señal, subtítulo y estado. */
export default function ParticipantTile({ uid, esYo, silenciado, hablando, seleccionado, subtitulo, reconectando }: Props) {
  const usuario = userService.find(uid)
  if (!usuario) return null

  const senal = reconectando ? 'media' : 'buena'
  const Senal = senal === 'buena' ? SignalHigh : SignalMedium
  const [principal, anterior] = subtitulo ? partirSubtitulo(subtitulo) : ['', '']

  let estado: { texto: string; clase: string; icono: typeof AudioLines | null } | null = null
  if (reconectando) estado = { texto: 'Reconectando…', clase: 'text-warning', icono: null }
  else if (silenciado) estado = { texto: 'Silenciado', clase: 'text-recording', icono: null }
  else if (hablando) estado = { texto: 'Hablando', clase: 'text-voice', icono: AudioLines }
  else if (seleccionado) estado = { texto: 'Seleccionado', clase: 'text-indigo-300', icono: null }

  return (
    <div
      className={cn(
        'relative flex min-h-0 items-center justify-center rounded-xl border-2 bg-panel transition-colors',
        reconectando && 'opacity-60',
        hablando && !silenciado ? 'border-voice' : seleccionado ? 'border-primary' : 'border-line',
      )}
    >
      <Senal
        className={cn('absolute top-3 right-3 size-3.5', senal === 'buena' ? 'text-online' : 'text-warning')}
        aria-label={senal === 'buena' ? 'Conexión buena' : 'Conexión inestable'}
      />

      <div
        className={cn(
          'flex size-20 items-center justify-center rounded-full text-title font-bold text-slate-900 transition-shadow lg:size-24 lg:text-display',
          hablando && !silenciado && 'ring-4 ring-voice',
        )}
        style={{ backgroundColor: usuario.color }}
        aria-hidden
      >
        {usuario.iniciales}
      </div>

      {subtitulo && (
        <p className="absolute inset-x-4 bottom-14 rounded-lg bg-base/70 px-3 py-2 text-left text-caption">
          <span className="text-fg">{principal}</span>
          {anterior && <span className="block text-muted">{anterior}</span>}
        </p>
      )}

      <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg bg-base/70 px-2.5 py-1.5 text-caption">
        {silenciado ? <MicOff className="size-3.5 shrink-0 text-recording" /> : <Mic className="size-3.5 shrink-0 text-muted" />}
        <span className="truncate font-medium">
          {usuario.nombre}
          {esYo && ' (tú)'}
        </span>
        {estado && (
          <span className={cn('flex shrink-0 items-center gap-1', estado.clase)}>
            {estado.icono && <estado.icono className="size-3.5" />}
            {estado.texto}
          </span>
        )}
      </div>
    </div>
  )
}