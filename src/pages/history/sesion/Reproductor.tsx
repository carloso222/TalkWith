import { AudioLines, Download, Loader2, MoreHorizontal, Pause, Play, RotateCcw, RotateCw, Trash2, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Avatar from '../../../components/ui/Avatar'
import Badge from '../../../components/ui/Badge'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { cn } from '../../../lib/cn'
import { recordingService, userService } from '../../../services'
import { useUiStore } from '../../../store/uiStore'
import type { Grabacion, Segmento, SesionVoz } from '../../../types'
import { aSegundos, formaDeOnda, formatoTiempo } from './utils'

const VELOCIDADES = [1, 1.25, 1.5, 2]

interface Props {
  sesion: SesionVoz
  grabacion: Grabacion | null
  segmentos: Segmento[]
  /** Segundo en el que debe abrir el reproductor (desde «Reproducir desde aquí»). */
  inicio?: number
}

/**
 * Figma 19 · Sesión — grabación y 20 · Confirmar eliminación.
 * El audio es simulado: el tiempo avanza con un temporizador. Eliminar solo
 * muestra la confirmación y una notificación; no se borra ningún registro.
 */
export default function Reproductor({ sesion, grabacion, segmentos, inicio = 0 }: Props) {
  if (sesion.grabacion === 'procesando') {
    return (
      <Vacio icono={<Loader2 className="size-6 animate-spin text-warning" />} titulo="Estamos procesando la grabación" texto="El audio estará disponible en unos minutos. Mientras tanto puedes revisar la transcripción." />
    )
  }
  if (!grabacion) {
    return <Vacio icono={<AudioLines className="size-6 text-muted" />} titulo="Esta sesión no se grabó" texto="Solo se guardó la transcripción. Para grabar una llamada, todos los participantes deben aceptar." />
  }
  return <ReproductorAudio sesion={sesion} grabacion={grabacion} segmentos={segmentos} inicio={inicio} />
}

function ReproductorAudio({ sesion, grabacion, segmentos, inicio = 0 }: Props & { grabacion: Grabacion }) {
  const total = aSegundos(sesion.duracion)
  const [tiempo, setTiempo] = useState(Math.min(inicio, total))
  const [reproduciendo, setReproduciendo] = useState(inicio > 0)
  const [velocidad, setVelocidad] = useState(1)
  const [volumen, setVolumen] = useState(0.8)
  const [menu, setMenu] = useState(false)
  const cerrarMenu = useCallback(() => setMenu(false), [])
  const refMenu = useClickOutside<HTMLDivElement>(cerrarMenu, menu)
  const confirm = useUiStore((s) => s.confirm)
  const notify = useUiStore((s) => s.notify)

  const onda = useMemo(() => formaDeOnda(sesion.sesionId), [sesion.sesionId])
  const autor = userService.find(grabacion.creadorUid)

  // Momento de cada intervención dentro del audio.
  const base = segmentos[0] ? aSegundos(segmentos[0].marcaTiempo) - 64 : 0
  const marcas = segmentos.map((s) => ({ s, seg: Math.max(0, aSegundos(s.marcaTiempo) - base) }))
  const actualId = [...marcas].reverse().find((m) => m.seg <= tiempo)?.s.segmentoId

  useEffect(() => {
    if (!reproduciendo) return
    const id = setInterval(() => {
      setTiempo((t) => {
        const next = t + 0.25 * velocidad
        if (next >= total) {
          setReproduciendo(false)
          return total
        }
        return next
      })
    }, 250)
    return () => clearInterval(id)
  }, [reproduciendo, velocidad, total])

  const saltar = (d: number) => setTiempo((t) => Math.min(total, Math.max(0, t + d)))
  const progreso = total ? tiempo / total : 0

  const descargar = () => {
    cerrarMenu()
    notify('info', 'Descarga simulada', `«${grabacion.titulo}» (${grabacion.tamano}). En esta entrega no se descarga ningún archivo.`)
  }

  const eliminar = async () => {
    cerrarMenu()
    setReproduciendo(false)
    const ok = await confirm({
      titulo: '¿Eliminar la grabación?',
      descripcion: `Se eliminará el audio de «${grabacion.titulo}» para todos los participantes. La transcripción se conserva. Esta acción no se puede deshacer.`,
      confirmar: 'Eliminar grabación',
      peligro: true,
    })
    if (!ok) return
    await recordingService.remove(grabacion.grabacionId)
    notify('exito', 'Grabación eliminada', 'Es una demostración: el registro sigue disponible.')
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-2xl border border-line bg-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-subtitle font-semibold">Grabación de la sesión</h2>
            <p className="text-caption text-muted">
              Grabó {autor?.nombre} · {grabacion.tamano} · {grabacion.aceptaron} de {grabacion.participantes} aceptaron
            </p>
          </div>
          <div ref={refMenu} className="relative">
            <button onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label="Acciones de la grabación" className="rounded-lg p-2 text-muted hover:bg-raised hover:text-fg">
              <MoreHorizontal className="size-5" />
            </button>
            {menu && (
              <div role="menu" className="animate-dialog-in absolute top-11 right-0 z-20 w-52 rounded-xl border border-line bg-panel p-1.5 shadow-high">
                <button role="menuitem" onClick={descargar} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-small hover:bg-raised">
                  <Download className="size-4 text-muted" /> Descargar audio
                </button>
                <button role="menuitem" onClick={eliminar} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-small text-recording hover:bg-recording/10">
                  <Trash2 className="size-4" /> Eliminar grabación
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Forma de onda: clic para saltar a ese punto. */}
        <div className="relative pt-7">
          <span className="absolute top-0 -translate-x-1/2 rounded-md bg-primary px-1.5 py-0.5 font-mono text-caption text-white tabular-nums" style={{ left: `${progreso * 100}%` }}>
            {formatoTiempo(tiempo)}
          </span>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Posición de la grabación"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={Math.round(tiempo)}
            aria-valuetext={`${formatoTiempo(tiempo)} de ${formatoTiempo(total)}`}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') saltar(5)
              if (e.key === 'ArrowLeft') saltar(-5)
              if (e.key === ' ') {
                e.preventDefault()
                setReproduciendo((v) => !v)
              }
            }}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              setTiempo(((e.clientX - r.left) / r.width) * total)
            }}
            className="flex h-20 cursor-pointer items-center gap-[3px] rounded-lg"
          >
            {onda.map((h, i) => (
              <span key={i} className={cn('flex-1 rounded-full transition-colors', i / onda.length < progreso ? 'bg-voice' : 'bg-raised')} style={{ height: `${h * 100}%` }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between font-mono text-caption text-muted tabular-nums">
            <span>{formatoTiempo(tiempo)}</span>
            <span>{formatoTiempo(total)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex w-40 items-center gap-2">
            <button onClick={() => setVolumen((v) => (v ? 0 : 0.8))} className="text-muted hover:text-fg" aria-label={volumen ? 'Silenciar' : 'Activar sonido'}>
              {volumen ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={volumen} onChange={(e) => setVolumen(Number(e.target.value))} aria-label="Volumen" className="h-1 w-full cursor-pointer accent-primary" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => saltar(-10)} className="rounded-full p-2 text-muted hover:bg-raised hover:text-fg" aria-label="Retroceder 10 segundos">
              <RotateCcw className="size-5" />
            </button>
            <button onClick={() => setReproduciendo((v) => !v)} className="flex size-12 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 active:bg-primary-active" aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}>
              {reproduciendo ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
            </button>
            <button onClick={() => saltar(10)} className="rounded-full p-2 text-muted hover:bg-raised hover:text-fg" aria-label="Adelantar 10 segundos">
              <RotateCw className="size-5" />
            </button>
          </div>
          <div className="flex w-40 justify-end">
            <button
              onClick={() => setVelocidad((v) => VELOCIDADES[(VELOCIDADES.indexOf(v) + 1) % VELOCIDADES.length])}
              className="rounded-lg border border-line px-2.5 py-1 font-mono text-caption hover:bg-raised"
              aria-label="Cambiar velocidad"
            >
              {velocidad}×
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-small font-semibold">Intervenciones</h2>
        <ol className="flex flex-col">
          {marcas.map(({ s, seg }) => {
            const actual = s.segmentoId === actualId && tiempo > 0
            return (
              <li key={s.segmentoId}>
                <button
                  onClick={() => {
                    setTiempo(seg)
                    setReproduciendo(true)
                  }}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors', actual ? 'bg-primary/10' : 'hover:bg-panel')}
                >
                  <span className="w-12 font-mono text-caption text-muted tabular-nums">{formatoTiempo(seg)}</span>
                  <Avatar uid={s.hablanteUid} size="xs" />
                  <span className={cn('flex-1 truncate text-small', actual ? 'text-fg' : 'text-muted')}>{s.texto}</span>
                  {actual && reproduciendo && <Badge tone="voice" icon={<AudioLines className="size-3" />}>Reproduciendo</Badge>}
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

function Vacio({ icono, titulo, texto }: { icono: ReactNode; titulo: string; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-raised">{icono}</span>
      <h2 className="text-subtitle font-semibold">{titulo}</h2>
      <p className="max-w-md text-small text-muted">{texto}</p>
    </div>
  )
}
