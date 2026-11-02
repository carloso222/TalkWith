import { ChevronDown, ChevronUp, Play, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Avatar from '../../../components/ui/Avatar'
import Highlight from '../../../components/ui/Highlight'
import { useDebounce } from '../../../hooks/useDebounce'
import { cn } from '../../../lib/cn'
import { normalizar, terminos, userService } from '../../../services'
import type { Segmento } from '../../../types'
import { aSegundos } from './utils'

interface Props {
  segmentos: Segmento[]
  hayGrabacion: boolean
  /** Término que llega desde la búsqueda global (?q=). */
  consultaInicial?: string
  onReproducirDesde: (segundo: number) => void
}

/** Figma 18 · Pestaña de transcripción con búsqueda dentro de la sesión. */
export default function Transcripcion({ segmentos, hayGrabacion, consultaInicial = '', onReproducirDesde }: Props) {
  const [consulta, setConsulta] = useState(consultaInicial)
  const busqueda = useDebounce(consulta, 200)
  // Índice de la coincidencia activa; se reinicia solo cuando cambia la búsqueda.
  const [posicion, setPosicion] = useState({ q: '', i: 0 })
  const actual = posicion.q === busqueda ? posicion.i : 0
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const filas = useRef<Record<string, HTMLLIElement | null>>({})

  const coincidencias = useMemo(() => {
    const palabras = terminos(busqueda)
    if (!palabras.length) return []
    return segmentos.filter((s) => palabras.some((w) => normalizar(s.texto).includes(w))).map((s) => s.segmentoId)
  }, [busqueda, segmentos])

  const activoId = coincidencias[actual]
  useEffect(() => {
    if (activoId) filas.current[activoId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activoId])

  const mover = (paso: number) => {
    if (!coincidencias.length) return
    setPosicion({ q: busqueda, i: (actual + paso + coincidencias.length) % coincidencias.length })
  }

  const inicio = segmentos[0] ? aSegundos(segmentos[0].marcaTiempo) - 64 : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-10 items-center gap-2 rounded-[10px] border border-line bg-panel px-3 focus-within:border-primary">
        <Search className="size-4 shrink-0 text-muted" />
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') mover(e.shiftKey ? -1 : 1)
          }}
          placeholder="Buscar en esta transcripción"
          aria-label="Buscar en esta transcripción"
          className="min-w-0 flex-1 bg-transparent text-small placeholder:text-muted focus:outline-none"
        />
        {busqueda && (
          <>
            <span className="text-caption whitespace-nowrap text-muted" aria-live="polite">
              {coincidencias.length ? `${actual + 1} de ${coincidencias.length}` : 'Sin coincidencias'}
            </span>
            <button onClick={() => mover(-1)} disabled={!coincidencias.length} className="rounded p-1 text-muted hover:bg-raised hover:text-fg disabled:opacity-40" aria-label="Coincidencia anterior">
              <ChevronUp className="size-4" />
            </button>
            <button onClick={() => mover(1)} disabled={!coincidencias.length} className="rounded p-1 text-muted hover:bg-raised hover:text-fg disabled:opacity-40" aria-label="Coincidencia siguiente">
              <ChevronDown className="size-4" />
            </button>
            <button onClick={() => setConsulta('')} className="rounded p-1 text-muted hover:bg-raised hover:text-fg" aria-label="Limpiar búsqueda">
              <X className="size-4" />
            </button>
          </>
        )}
      </div>

      {segmentos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-small text-muted">Esta sesión todavía no tiene segmentos transcritos.</p>
      ) : (
        <ol className="flex flex-col">
          {segmentos.map((s) => {
            const u = userService.find(s.hablanteUid)
            const esActivo = s.segmentoId === activoId
            const elegido = s.segmentoId === seleccion
            return (
              <li
                key={s.segmentoId}
                ref={(el) => {
                  filas.current[s.segmentoId] = el
                }}
                onClick={() => setSeleccion(elegido ? null : s.segmentoId)}
                className={cn(
                  'group grid cursor-pointer grid-cols-[72px_1fr] gap-4 rounded-xl border-l-2 px-3 py-3 transition-colors',
                  esActivo ? 'border-warning bg-warning/[0.06]' : elegido ? 'border-primary bg-primary/[0.08]' : 'border-transparent hover:bg-panel',
                )}
              >
                <time className="pt-0.5 font-mono text-caption text-muted tabular-nums">{s.marcaTiempo}</time>
                <div className="flex gap-3">
                  <Avatar uid={s.hablanteUid} size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-small font-medium">{u?.nombre}</span>
                    <p className="text-body text-fg/90">
                      <Highlight texto={s.texto} consulta={busqueda} activo={esActivo} />
                    </p>
                    {elegido && hayGrabacion && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onReproducirDesde(Math.max(0, aSegundos(s.marcaTiempo) - inicio))
                        }}
                        className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full bg-primary px-3 py-1 text-caption font-medium text-white hover:bg-primary/90"
                      >
                        <Play className="size-3 fill-current" /> Reproducir desde aquí
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <p className="text-caption text-muted">Selecciona una intervención para escucharla en la grabación. Enter y Shift + Enter recorren las coincidencias.</p>
    </div>
  )
}
