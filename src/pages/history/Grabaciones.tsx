import { Check, CircleDot, Clock, Download, Info, Pause, Play, Trash2, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useParams } from 'react-router'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import type { GrabacionItem } from '../../mocks/recordings'
import { recordingLibraryService } from '../../services/recordingLibraryService'
import { useUiStore } from '../../store/uiStore'

/** Pantalla 21: grabaciones del servidor, con reproducción simulada, descarga y eliminación con confirmación. */
export default function Grabaciones() {
  const { serverId = '' } = useParams()
  const notify = useUiStore((s) => s.notify)
  const confirm = useUiStore((s) => s.confirm)
  const { data, loading } = useService(() => recordingLibraryService.getByServer(serverId), [serverId])

  // undefined = la primera grabación suena por defecto (como en el Figma); null = ninguna.
  const [seleccion, setSeleccion] = useState<string | null | undefined>(undefined)
  const items: GrabacionItem[] = data?.items ?? []
  const reproduciendoId = seleccion === undefined ? (items[0]?.id ?? null) : seleccion

  const eliminar = async (g: GrabacionItem) => {
    const ok = await confirm({
      titulo: '¿Eliminar la grabación?',
      descripcion: `«${g.titulo}» se eliminará para todos los participantes. Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar',
      peligro: true,
    })
    // La entrega no borra nada: solo muestra la notificación.
    if (ok) notify('exito', 'Grabación eliminada', g.titulo)
  }

  const resumen = data?.resumen
  const porcentaje = resumen ? Math.min(100, (resumen.usadoMb / resumen.limiteMb) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-6xl px-8 py-10">
      <h1 className="text-title font-bold">Grabaciones</h1>
      <p className="mt-1 text-small text-muted">Audios grabados con el consentimiento de todos los participantes</p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat icono={<CircleDot className="size-5" />} tono="bg-recording/15 text-recording" valor={`${resumen?.esteMes ?? 0} grabaciones`} etiqueta="Este mes" />
        <Stat icono={<Clock className="size-5" />} tono="bg-primary/15 text-indigo-400" valor={resumen?.duracionTotal ?? '—'} etiqueta="Duración total" />
        <Stat icono={<Upload className="size-5" />} tono="bg-voice/15 text-voice" valor={resumen ? `${resumen.usadoMb} MB de ${resumen.limiteMb / 1024} GB` : '—'} etiqueta="Almacenamiento usado">
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={Math.round(porcentaje)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-voice" style={{ width: `${porcentaje}%` }} />
          </div>
        </Stat>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-panel">
        {loading ? (
          <div className="h-72 animate-pulse bg-raised/30" aria-busy />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <CircleDot className="size-8 text-muted" />
            <p className="text-subtitle font-semibold">Aún no hay grabaciones</p>
            <p className="max-w-sm text-small text-muted">Cuando todas las personas de una llamada acepten grabar, el audio aparecerá aquí.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="bg-raised/40 text-caption font-medium tracking-wide text-muted uppercase">
                  <th className="px-4 py-3 font-medium">Grabación</th>
                  <th className="px-4 py-3 font-medium">Duración</th>
                  <th className="px-4 py-3 font-medium">Grabó</th>
                  <th className="px-4 py-3 font-medium">Consentimiento</th>
                  <th className="px-4 py-3 font-medium">Tamaño</th>
                  <th className="w-24 px-4 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((g: GrabacionItem) => {
                  const sonando = reproduciendoId === g.id
                  const completo = g.aceptaron === g.participantes
                  return (
                    <tr key={g.id} className={cn('border-t border-line transition-colors', sonando ? 'bg-primary/10' : 'hover:bg-raised/40')}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSeleccion(sonando ? null : g.id)}
                            aria-label={`${sonando ? 'Pausar' : 'Reproducir'} ${g.titulo}`}
                            aria-pressed={sonando}
                            className={cn('flex size-9 shrink-0 items-center justify-center rounded-full transition-colors', sonando ? 'bg-primary text-white hover:bg-primary-active' : 'bg-raised text-fg hover:bg-line')}
                          >
                            {sonando ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                          </button>
                          <div className="min-w-0">
                            <p className={cn('truncate text-small font-medium', sonando && 'text-indigo-400')}>{g.titulo}</p>
                            <p className="truncate text-caption text-muted">{g.canalNombre} · {g.fecha}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-small tabular-nums">{g.duracion}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-slate-900" style={{ backgroundColor: g.creador.color }} aria-hidden>
                            {g.creador.iniciales}
                          </span>
                          <span className="text-small">{g.creador.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption font-medium', completo ? 'bg-online/15 text-online' : 'bg-warning/15 text-warning')}>
                          {completo ? <Check className="size-3" /> : <Clock className="size-3" />}
                          {g.aceptaron} de {g.participantes} aceptaron
                        </span>
                      </td>
                      <td className="px-4 py-3 text-small tabular-nums">{g.tamano}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => notify('info', 'Descargando grabación', g.titulo)} aria-label={`Descargar ${g.titulo}`} title="Descargar" className="rounded-lg p-2 text-muted transition-colors hover:bg-raised hover:text-fg">
                            <Download className="size-4" />
                          </button>
                          <button onClick={() => eliminar(g)} aria-label={`Eliminar ${g.titulo}`} title="Eliminar" className="rounded-lg p-2 text-recording transition-colors hover:bg-recording/15">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 text-caption text-muted">
        <Info className="size-3.5 shrink-0" />
        Solo los miembros del servidor pueden reproducir o descargar las grabaciones. Antes de eliminar una se pide confirmación.
      </p>
    </div>
  )
}

function Stat({ icono, tono, valor, etiqueta, children }: { icono: ReactNode; tono: string; valor: string; etiqueta: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-panel p-5">
      <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', tono)}>{icono}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-subtitle font-semibold">{valor}</p>
        <p className="text-caption text-muted">{etiqueta}</p>
        {children}
      </div>
    </div>
  )
}