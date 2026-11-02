import { ArrowLeft, CalendarDays, ChevronRight, CircleDot, Headphones, Search } from 'lucide-react'
import { useState, type ButtonHTMLAttributes } from 'react'
import { useNavigate, useParams } from 'react-router'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Dropdown from '../../components/ui/Dropdown'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { channelService, normalizar, serverService, sessionService, userService } from '../../services'
import { useUiStore } from '../../store/uiStore'
import type { SesionVoz } from '../../types'

type Periodo = '7' | '30' | 'todo'
type EstadoGrabacion = SesionVoz['grabacion']

const POR_PAGINA = 6
const MAX_AVATARES = 4

/** Figma 17 · Historial de sesiones (listado). Responsable: Isaian. */
export default function Sesiones() {
  useDocumentTitle('Historial de sesiones')
  const { serverId = '' } = useParams()
  const navigate = useNavigate()
  const notify = useUiStore((s) => s.notify)
  const servidor = serverService.find(serverId)
  const { data, loading } = useService(() => sessionService.getByServer(serverId), [serverId])

  const [busqueda, setBusqueda] = useState('')
  const [canal, setCanal] = useState<string | null>(null)
  const [periodo, setPeriodo] = useState<Periodo | null>('30')
  const [grabacion, setGrabacion] = useState<EstadoGrabacion | null>(null)
  const [pagina, setPagina] = useState(1)

  const canalesVoz = channelService.listByServer(serverId).filter((c) => c.tipo === 'voz')
  const total = sessionService.total(serverId)
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))

  // Filtros locales sobre los datos de ejemplo.
  const q = normalizar(busqueda.trim())
  const sesiones = (data ?? []).filter((s) => {
    if (canal && s.canalId !== canal) return false
    if (grabacion && s.grabacion !== grabacion) return false
    if (!q) return true
    const nombres = [channelService.find(s.canalId)?.nombre ?? '', ...s.participantes.map((uid) => userService.find(uid)?.nombre ?? '')]
    return nombres.some((n) => normalizar(n).includes(q))
  })
  const filtrando = Boolean(q || canal || grabacion)

  return (
    <div className="flex flex-col gap-6 px-12 pt-9 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-title font-bold tracking-tight">Historial de sesiones</h1>
          <p className="text-muted">{total} conversaciones de voz transcritas en {servidor?.nombre}</p>
        </div>
        <Button variant="secundario" onClick={() => notify('info', 'Exportación en preparación', 'Te avisaremos cuando el archivo con las transcripciones esté listo.')}>
          Exportar transcripciones
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-[360px] max-w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por canal o participante"
            aria-label="Buscar por canal o participante"
            className="h-10 w-full rounded-[10px] border border-line bg-panel pr-3 pl-10 text-small placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </label>
        <Dropdown variante="campo" etiqueta="Canal" textoTodos="Todos" icono={<Headphones className="size-4" />} valor={canal} onChange={setCanal} opciones={canalesVoz.map((c) => ({ valor: c.canalId, label: c.nombre }))} />
        <Dropdown<Periodo>
          variante="campo"
          etiqueta=""
          icono={<CalendarDays className="size-4" />}
          valor={periodo}
          onChange={setPeriodo}
          opciones={[
            { valor: '7', label: 'Últimos 7 días' },
            { valor: '30', label: 'Últimos 30 días' },
            { valor: 'todo', label: 'Todo el historial' },
          ]}
        />
        <Dropdown<EstadoGrabacion>
          variante="campo"
          etiqueta="Grabación"
          textoTodos="Cualquiera"
          icono={<CircleDot className="size-4" />}
          valor={grabacion}
          onChange={setGrabacion}
          opciones={[
            { valor: 'grabada', label: 'Grabada' },
            { valor: 'procesando', label: 'Procesando' },
            { valor: 'sin-grabacion', label: 'Sin grabación' },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-line bg-panel">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-raised/50 text-caption font-medium tracking-wide text-muted uppercase">
            <tr>
              <th className="py-3 pr-4 pl-5 font-medium">Canal</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Duración</th>
              <th className="px-4 py-3 font-medium">Participantes</th>
              <th className="px-4 py-3 font-medium">Transcripción</th>
              <th className="px-4 py-3 font-medium">Grabación</th>
              <th className="w-12" aria-label="Abrir" />
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }, (_, i) => (
                <tr key={i} className="border-t border-line">
                  <td colSpan={7} className="px-5 py-4"><div className="h-6 animate-pulse rounded bg-raised" /></td>
                </tr>
              ))}
            {!loading &&
              sesiones.map((s) => (
                <tr
                  key={s.sesionId}
                  onClick={() => navigate(rutas.sesion(serverId, s.sesionId))}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(rutas.sesion(serverId, s.sesionId))}
                  tabIndex={0}
                  className="h-[60px] cursor-pointer border-t border-line text-body transition-colors hover:bg-raised/60 focus-visible:bg-raised/60 focus-visible:outline-none"
                >
                  <td className="py-2 pr-4 pl-5">
                    <span className="flex items-center gap-2 font-medium"><Headphones className="size-[18px] text-muted" /> {channelService.find(s.canalId)?.nombre}</span>
                  </td>
                  <td className="px-4 text-muted">{s.inicio}</td>
                  <td className="px-4 tabular-nums">{s.duracion}</td>
                  <td className="px-4"><PilaAvatares uids={s.participantes} /></td>
                  <td className="px-4 text-muted">{s.totalSegmentos} segmentos</td>
                  <td className="px-4"><EstadoGrabacionBadge estado={s.grabacion} /></td>
                  <td className="pr-5 text-muted"><ChevronRight className="ml-auto size-[18px]" /></td>
                </tr>
              ))}
            {!loading && sesiones.length === 0 && (
              <tr className="border-t border-line">
                <td colSpan={7} className="px-5 py-12 text-center text-muted">Ninguna sesión coincide con los filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-small text-muted">
        <p>
          {filtrando ? `${sesiones.length} sesiones coinciden con los filtros` : `Mostrando ${(pagina - 1) * POR_PAGINA + 1}–${Math.min(pagina * POR_PAGINA, total)} de ${total} sesiones`}
        </p>
        <nav aria-label="Paginación" className="flex items-center gap-1.5">
          <BotonPagina onClick={() => setPagina((p) => p - 1)} disabled={pagina === 1}>
            <ArrowLeft className="size-3.5" /> Anterior
          </BotonPagina>
          {numerosPagina(pagina, paginas).map((n, i) =>
            n === '…' ? (
              <span key={`e${i}`} className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-line px-2">…</span>
            ) : (
              <BotonPagina key={n} activo={n === pagina} onClick={() => setPagina(n)} aria-current={n === pagina ? 'page' : undefined}>
                {n}
              </BotonPagina>
            ),
          )}
          <BotonPagina onClick={() => setPagina((p) => p + 1)} disabled={pagina === paginas}>
            Siguiente
          </BotonPagina>
        </nav>
      </footer>
    </div>
  )
}

/** 1 2 3 … 5 (como en el Figma). */
function numerosPagina(actual: number, total: number): (number | '…')[] {
  if (total <= 4) return Array.from({ length: total }, (_, i) => i + 1)
  const inicio = Math.min(Math.max(actual - 1, 1), total - 3)
  const centro = [inicio, inicio + 1, inicio + 2]
  return [...(inicio > 1 ? [1, '…' as const] : []), ...centro, ...(inicio + 2 < total - 1 ? ['…' as const] : []), total]
}

function BotonPagina({ activo, className, ...rest }: { activo?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        'flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-caption font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        activo ? 'border-primary bg-primary text-white' : 'border-line text-fg hover:bg-raised',
        className,
      )}
    />
  )
}

function PilaAvatares({ uids }: { uids: string[] }) {
  const visibles = uids.slice(0, uids.length > MAX_AVATARES ? MAX_AVATARES - 1 : MAX_AVATARES)
  const resto = uids.length - visibles.length
  return (
    <span className="flex items-center">
      {visibles.map((uid, i) => (
        <Avatar key={uid} uid={uid} size="xs" className={cn('rounded-full ring-2 ring-panel', i > 0 && '-ml-1.5')} />
      ))}
      {resto > 0 && <span className="-ml-1.5 flex size-6 items-center justify-center rounded-full bg-raised text-[10px] font-medium text-muted ring-2 ring-panel">+{resto}</span>}
    </span>
  )
}

function EstadoGrabacionBadge({ estado }: { estado: EstadoGrabacion }) {
  if (estado === 'grabada') return <Badge tone="recording" dot>Grabada</Badge>
  if (estado === 'procesando') return <Badge tone="warning" dot>Procesando</Badge>
  return <span className="text-muted">—</span>
}
