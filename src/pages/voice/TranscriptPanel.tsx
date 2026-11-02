import { AudioLines, Info, MicOff, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { userService } from '../../services'
import type { Segmento } from '../../types'
import Avatar from '../../components/ui/Avatar'

interface Props {
  segmentos: Segmento[]
  seleccionadoId: string | null
  onSeleccionar: (segmentoId: string) => void
  onCerrar: () => void
  /** false cuando el micrófono está bloqueado o el navegador no reconoce voz (Figma 13). */
  disponible: boolean
  /** true solo si hay una sesión transmitiendo en este canal. */
  enVivo: boolean
  onRevisarPermisos: () => void
}

/** Panel lateral «Transcripción en vivo» (Figma 12, 13 y 16). */
export default function TranscriptPanel({ segmentos, seleccionadoId, onSeleccionar, onCerrar, disponible, enVivo, onRevisarPermisos }: Props) {
  const lista = useRef<HTMLDivElement>(null)

  // Mantiene visible lo último que se dijo.
  useEffect(() => {
    lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' })
  }, [segmentos.length])

  return (
    <aside aria-label="Transcripción en vivo" className="flex w-[360px] shrink-0 flex-col border-l border-line bg-base">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="text-subtitle font-semibold">Transcripción en vivo</h2>
        <div className="flex items-center gap-2">
          {disponible && enVivo && (
            <span className="flex items-center gap-1.5 rounded-full bg-voice/15 px-2.5 py-0.5 text-caption font-medium text-voice">
              <span className="size-1.5 animate-pulse rounded-full bg-voice" />
              En vivo
            </span>
          )}
          <button onClick={onCerrar} className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-fg" aria-label="Cerrar transcripción">
            <X className="size-[18px]" />
          </button>
        </div>
      </header>

      {!disponible ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-warning/15 text-warning">
            <MicOff className="size-6" />
          </div>
          <h3 className="text-subtitle font-semibold">No podemos generar subtítulos</h3>
          <p className="text-small text-muted">Tu navegador no permite reconocer la voz o el micrófono está bloqueado. La llamada sigue activa y los demás te escuchan.</p>
          <button onClick={onRevisarPermisos} className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-small font-medium text-white transition-colors hover:bg-primary-active active:bg-primary-active">
            Revisar permisos del micrófono
          </button>
          <p className="text-caption text-muted">El reconocimiento funciona en Chrome y Edge actualizados.</p>
        </div>
      ) : (
        <>
          <div ref={lista} className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex min-h-full flex-col justify-end gap-1 p-3">
              {segmentos.length === 0 && <p className="px-3 py-6 text-center text-small text-muted">{enVivo ? 'Aún no hay intervenciones. Cuando alguien hable, la transcripción aparecerá aquí.' : 'No hay una sesión transcribiéndose en este canal.'}</p>}
              {segmentos.map((g, i) => {
                const seleccionado = g.segmentoId === seleccionadoId
                const escuchando = i === segmentos.length - 1
                return (
                  <button
                    key={g.segmentoId}
                    onClick={() => onSeleccionar(g.segmentoId)}
                    aria-pressed={seleccionado}
                    className={cn('flex w-full gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:bg-raised/60', seleccionado && 'border-primary/40 bg-primary/10 hover:bg-primary/15')}
                  >
                    <Avatar uid={g.hablanteUid} size="sm" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2">
                        <span className="text-small font-medium">{userService.find(g.hablanteUid)?.nombre}</span>
                        <span className="text-caption text-muted tabular-nums">{g.marcaTiempo}</span>
                        {escuchando && (
                          <span className="ml-auto flex items-center gap-1 text-caption text-voice">
                            <AudioLines className="size-3.5" />
                            Escuchando
                          </span>
                        )}
                      </span>
                      <span className="text-small text-fg/90">{g.texto}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <footer className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-3 text-caption text-muted">
            <Info className="size-3.5 shrink-0" />
            Selecciona una intervención para resaltar a quien habló.
          </footer>
        </>
      )}
    </aside>
  )
}