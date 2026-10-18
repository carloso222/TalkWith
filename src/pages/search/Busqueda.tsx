import { ArrowRight, AudioLines, Calendar, CornerDownLeft, Hash, Loader2, MessageSquare, Search, SearchX, Server, User, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Dropdown from '../../components/ui/Dropdown'
import Highlight from '../../components/ui/Highlight'
import { useDebounce } from '../../hooks/useDebounce'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { resultadosBusqueda } from '../../mocks/data'
import { searchService, userService } from '../../services'
import type { ResultadoBusqueda } from '../../types'

type Tipo = 'todo' | ResultadoBusqueda['tipo']
type Fecha = 'hoy' | 'semana'

const SUGERENCIAS = ['permisos del micrófono', 'rúbrica', 'portafolio', 'heurísticas']

// Opciones de filtro a partir de los datos de ejemplo.
const CANALES = [...new Set(resultadosBusqueda.map((r) => r.ubicacion))].map((u) => ({ valor: u, label: u }))
const PERSONAS = [...new Set(resultadosBusqueda.map((r) => r.autorUid))].map((uid) => ({ valor: uid, label: userService.find(uid)?.nombre ?? uid }))
const FECHAS: { valor: Fecha; label: string }[] = [
  { valor: 'hoy', label: 'Hoy' },
  { valor: 'semana', label: 'Últimos 7 días' },
]

const esDeHoy = (r: ResultadoBusqueda) => r.cuando.startsWith('Hoy')
const esDeLaSemana = (r: ResultadoBusqueda) => esDeHoy(r) || r.cuando.startsWith('Ayer')

/**
 * Figma 22 · Búsqueda global y 23 · Sin resultados. Responsable: Carlos.
 * Busca en mensajes y transcripciones (datos de ejemplo). La consulta vive en
 * la URL (?q=) para poder compartirla; se actualiza con debounce.
 */
export default function Busqueda() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [texto, setTexto] = useState(params.get('q') ?? '')
  const consulta = useDebounce(texto.trim(), 250)
  useDocumentTitle(consulta ? `Buscar «${consulta}»` : 'Búsqueda')

  const [tipo, setTipo] = useState<Tipo>('todo')
  const [canal, setCanal] = useState<string | null>(null)
  const [persona, setPersona] = useState<string | null>(null)
  const [fecha, setFecha] = useState<Fecha | null>(null)
  const [seleccion, setSeleccion] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  // Mantiene ?q= sincronizado con lo que se escribe.
  useEffect(() => {
    setParams(consulta ? { q: consulta } : {}, { replace: true })
  }, [consulta, setParams])

  const { data, loading } = useService(() => searchService.search(consulta), [consulta])
  const todos = useMemo(() => data ?? [], [data])

  const filtrados = useMemo(
    () =>
      todos.filter(
        (r) =>
          (!canal || r.ubicacion === canal) &&
          (!persona || r.autorUid === persona) &&
          (!fecha || (fecha === 'hoy' ? esDeHoy(r) : esDeLaSemana(r))),
      ),
    [todos, canal, persona, fecha],
  )
  const visibles = tipo === 'todo' ? filtrados : filtrados.filter((r) => r.tipo === tipo)
  const conteo = {
    todo: filtrados.length,
    mensaje: filtrados.filter((r) => r.tipo === 'mensaje').length,
    transcripcion: filtrados.filter((r) => r.tipo === 'transcripcion').length,
  }
  const hayFiltros = Boolean(canal || persona || fecha || tipo !== 'todo')
  const indice = Math.min(seleccion, Math.max(0, visibles.length - 1))

  const quitarFiltros = () => {
    setTipo('todo')
    setCanal(null)
    setPersona(null)
    setFecha(null)
  }

  const abrir = (r: ResultadoBusqueda) => navigate(`${r.ruta}?q=${encodeURIComponent(consulta)}`)

  // Regresa a la vista anterior; si se abrió directo, al inicio.
  const cerrar = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate(rutas.inicio))

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSeleccion(Math.min(indice + 1, visibles.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSeleccion(Math.max(indice - 1, 0))
    } else if (e.key === 'Enter' && visibles[indice]) {
      abrir(visibles[indice])
    } else if (e.key === 'Escape') {
      cerrar()
    }
  }

  return (
    <div className="flex min-h-full justify-center px-6 py-8">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-high">
        {/* Campo de búsqueda */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          {loading && consulta ? <Loader2 className="size-5 shrink-0 animate-spin text-muted" /> : <Search className="size-5 shrink-0 text-muted" />}
          <input
            ref={input}
            autoFocus
            onKeyDown={onKeyDown}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value)
              setSeleccion(0)
            }}
            placeholder="Buscar mensajes y transcripciones"
            aria-label="Buscar mensajes y transcripciones"
            className="min-w-0 flex-1 bg-transparent text-heading placeholder:text-muted focus:outline-none"
          />
          {texto && (
            <button onClick={() => { setTexto(''); input.current?.focus() }} className="rounded-md p-1 text-muted hover:bg-raised hover:text-fg" aria-label="Borrar búsqueda">
              <X className="size-4" />
            </button>
          )}
          <button onClick={cerrar} className="rounded-md bg-raised px-2 py-1 text-caption text-muted hover:text-fg">Esc</button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3 text-small">
            <Server className="size-3.5" /> Servidor: Estudio de Diseño
          </span>
          <Dropdown etiqueta="Canal" icono={<Hash className="size-3.5" />} valor={canal} opciones={CANALES} onChange={setCanal} />
          <Dropdown etiqueta="Participante" icono={<User className="size-3.5" />} valor={persona} opciones={PERSONAS} onChange={setPersona} />
          <Dropdown etiqueta="Fecha" icono={<Calendar className="size-3.5" />} valor={fecha} opciones={FECHAS} onChange={setFecha} />
        </div>

        {/* Pestañas por tipo */}
        {consulta && (
          <div role="tablist" className="flex items-center gap-1 px-5 pt-3">
            {(
              [
                ['todo', 'Todo'],
                ['mensaje', 'Mensajes'],
                ['transcripcion', 'Transcripciones'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tipo === id}
                onClick={() => setTipo(id)}
                className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-small', tipo === id ? 'bg-raised text-fg' : 'text-muted hover:text-fg')}
              >
                {label}
                <span className="text-caption text-muted">{conteo[id]}</span>
              </button>
            ))}
            {hayFiltros && (
              <button onClick={quitarFiltros} className="ml-auto text-caption text-primary hover:underline">
                Quitar filtros
              </button>
            )}
            <span className={cn('text-caption text-muted', !hayFiltros && 'ml-auto')}>
              {hayFiltros && <span aria-hidden className="mx-2">·</span>}
              {visibles.length} {visibles.length === 1 ? 'resultado' : 'resultados'} · Ordenado por relevancia
            </span>
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 px-3 py-3">
          {!consulta ? (
            <EstadoInicial onElegir={(s) => setTexto(s)} />
          ) : loading ? null : visibles.length === 0 ? (
            <SinResultados consulta={consulta} hayFiltros={hayFiltros} onQuitarFiltros={quitarFiltros} />
          ) : (
            <ul className="flex flex-col gap-1.5" aria-label="Resultados">
              {visibles.map((r, i) => (
                <Resultado key={r.resultadoId} r={r} consulta={consulta} activo={i === indice} onHover={() => setSeleccion(i)} onAbrir={() => abrir(r)} />
              ))}
            </ul>
          )}
        </div>

        <footer className="flex items-center gap-4 border-t border-line px-5 py-3 text-caption text-muted">
          <span className="flex items-center gap-1.5"><kbd className="rounded bg-raised px-1.5">↑</kbd><kbd className="rounded bg-raised px-1.5">↓</kbd> navegar</span>
          <span className="flex items-center gap-1.5"><kbd className="flex items-center rounded bg-raised px-1.5 py-0.5"><CornerDownLeft className="size-3" /></kbd> abrir en contexto</span>
          <span className="flex items-center gap-1.5"><kbd className="rounded bg-raised px-1.5">Esc</kbd> cerrar</span>
        </footer>
      </div>
    </div>
  )
}

function Resultado({ r, consulta, activo, onHover, onAbrir }: { r: ResultadoBusqueda; consulta: string; activo: boolean; onHover: () => void; onAbrir: () => void }) {
  const autor = userService.find(r.autorUid)
  const esVoz = r.tipo === 'transcripcion'
  return (
    <li>
      <div
        onMouseEnter={onHover}
        onClick={onAbrir}
        className={cn('group flex cursor-pointer flex-col gap-2.5 rounded-xl border p-4 transition-colors', activo ? 'border-primary/50 bg-raised/60' : 'border-transparent hover:bg-raised/40')}
      >
        <div className="flex items-center gap-2 text-caption text-muted">
          <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium', esVoz ? 'bg-voice/15 text-voice' : 'bg-primary/15 text-primary')}>
            {esVoz ? <AudioLines className="size-3" /> : <MessageSquare className="size-3" />}
            {esVoz ? 'Transcripción' : 'Mensaje'}
          </span>
          <span>{r.servidorNombre}</span>
          <span aria-hidden>·</span>
          <span className="text-fg/80">{r.ubicacion}</span>
          <span className="ml-auto">{r.cuando}</span>
        </div>
        <div className="flex gap-3">
          <Avatar uid={r.autorUid} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-small font-medium">{autor?.nombre}</span>
            <p className="text-body text-fg/90">
              <Highlight texto={r.fragmento} consulta={consulta} />
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAbrir()
            }}
            className={cn('flex h-8 items-center gap-1.5 self-center rounded-lg border border-line px-3 text-caption whitespace-nowrap transition-opacity hover:bg-raised', activo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
          >
            Abrir en contexto <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </li>
  )
}

function EstadoInicial({ onElegir }: { onElegir: (s: string) => void }) {
  return (
    <div className="flex flex-col gap-3 px-2 py-6">
      <p className="text-caption font-medium tracking-wide text-muted uppercase">Prueba con</p>
      <div className="flex flex-wrap gap-2">
        {SUGERENCIAS.map((s) => (
          <button key={s} onClick={() => onElegir(s)} className="inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-1.5 text-small hover:bg-raised/70">
            <Search className="size-3.5 text-muted" /> {s}
          </button>
        ))}
      </div>
      <p className="pt-4 text-small text-muted">La búsqueda incluye mensajes de los canales de texto y frases dichas en las llamadas transcritas.</p>
    </div>
  )
}

function SinResultados({ consulta, hayFiltros, onQuitarFiltros }: { consulta: string; hayFiltros: boolean; onQuitarFiltros: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center" role="status">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-raised">
        <SearchX className="size-7 text-muted" />
      </span>
      <h2 className="text-subtitle font-semibold">{hayFiltros ? 'No encontramos resultados con esos filtros' : `No encontramos «${consulta}»`}</h2>
      <p className="max-w-sm text-small text-muted">
        {hayFiltros ? 'Intenta quitar algún filtro o buscar con otras palabras.' : 'Revisa la ortografía o prueba con palabras más generales.'}
      </p>
      {hayFiltros && (
        <Button variant="secundario" size="sm" onClick={onQuitarFiltros}>
          Quitar filtros
        </Button>
      )}
    </div>
  )
}
