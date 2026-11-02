import { ArrowLeft, AudioLines, Calendar, Clock, FileText } from 'lucide-react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { channelService, recordingService, sessionService } from '../../services'
import Participantes from './sesion/Participantes'
import Reproductor from './sesion/Reproductor'
import Transcripcion from './sesion/Transcripcion'

type Pestana = 'transcripcion' | 'grabacion'

/**
 * Figma 18 · Sesión — transcripción, 19 · Sesión — grabación y
 * 20 · Confirmar eliminación. Responsable: Carlos.
 *
 * La pestaña activa vive en la URL (?tab=grabacion) para poder enlazarla
 * directamente; ?t=segundos abre el reproductor en ese momento.
 */
export default function DetalleSesion() {
  const { serverId = '', sessionId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const pestana: Pestana = params.get('tab') === 'grabacion' ? 'grabacion' : 'transcripcion'

  const { data: sesion, loading } = useService(() => sessionService.getById(sessionId), [sessionId])
  const { data: segmentos } = useService(() => sessionService.getSegments(sessionId), [sessionId])
  const { data: grabacion } = useService(() => recordingService.getBySession(sessionId), [sessionId])

  const canal = sesion ? channelService.find(sesion.canalId) : undefined
  useDocumentTitle(canal ? `${canal.nombre} · ${sesion?.inicio}` : 'Sesión')

  if (!loading && (!sesion || sesion.servidorId !== serverId)) return <Navigate to="/404" replace />

  const cambiarPestana = (p: Pestana, extra: Record<string, string> = {}) => {
    const next = new URLSearchParams(extra)
    const q = params.get('q')
    if (q) next.set('q', q)
    if (p === 'grabacion') next.set('tab', 'grabacion')
    setParams(next, { replace: true })
  }

  return (
    <div className="flex min-h-full gap-6 px-8 py-6">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <Link to={canal ? rutas.canal(serverId, canal.canalId) : rutas.sesiones(serverId)} className="inline-flex items-center gap-1.5 self-start text-small text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Volver a {canal?.nombre ?? 'el historial'}
        </Link>

        {!sesion || !canal ? (
          <Esqueleto />
        ) : (
          <>
            <header className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-title font-bold">{canal.nombre}</h1>
                {sesion.grabacion === 'grabada' && <Badge tone="online" dot>Grabación disponible</Badge>}
                {sesion.grabacion === 'procesando' && <Badge tone="warning" dot>Procesando grabación</Badge>}
                {sesion.grabacion === 'sin-grabacion' && <Badge>Sin grabación</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-small text-muted">
                <span className="flex items-center gap-1.5"><Calendar className="size-4" />{sesion.inicio}</span>
                <span className="flex items-center gap-1.5"><Clock className="size-4" />{sesion.duracion}</span>
                <span className="flex items-center gap-2">
                  <span className="flex -space-x-1.5">
                    {sesion.participantes.slice(0, 4).map((uid) => (
                      <Avatar key={uid} uid={uid} size="xs" className="rounded-full ring-2 ring-base" />
                    ))}
                  </span>
                  {sesion.participantes.length} participantes
                </span>
                <span className="flex items-center gap-1.5"><FileText className="size-4" />{sesion.totalSegmentos} segmentos</span>
              </div>
            </header>

            <div role="tablist" aria-label="Contenido de la sesión" className="flex gap-6 border-b border-line">
              {(
                [
                  ['transcripcion', 'Transcripción', FileText],
                  ['grabacion', 'Grabación', AudioLines],
                ] as const
              ).map(([id, label, Icono]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={pestana === id}
                  onClick={() => cambiarPestana(id)}
                  className={cn('-mb-px flex items-center gap-2 border-b-2 pb-3 text-small font-medium transition-colors', pestana === id ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg')}
                >
                  <Icono className="size-4" /> {label}
                </button>
              ))}
            </div>

            {pestana === 'transcripcion' ? (
              <Transcripcion
                segmentos={segmentos ?? []}
                hayGrabacion={Boolean(grabacion)}
                consultaInicial={params.get('q') ?? ''}
                onReproducirDesde={(seg) => cambiarPestana('grabacion', { t: String(seg) })}
              />
            ) : (
              <Reproductor sesion={sesion} grabacion={grabacion} segmentos={segmentos ?? []} inicio={Number(params.get('t') ?? 0)} />
            )}
          </>
        )}
      </div>

      {sesion && <Participantes sesion={sesion} />}
    </div>
  )
}

function Esqueleto() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-label="Cargando sesión">
      <div className="h-8 w-64 rounded-lg bg-panel" />
      <div className="h-4 w-96 rounded bg-panel" />
      <div className="mt-4 h-10 w-full rounded-lg bg-panel" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-14 w-full rounded-lg bg-panel/60" />
      ))}
    </div>
  )
}
