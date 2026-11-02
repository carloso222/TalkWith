import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import CallHeader from './CallHeader'
import ControlBar from './ControlBar'
import ParticipantTile from './ParticipantTile'
import RecordingBanner from './RecordingBanner'
import RecordingDialog from './RecordingDialog'
import TranscriptPanel from './TranscriptPanel'
import { useRecordingFlow } from '../../hooks/useRecordingFlow'
import { useService } from '../../hooks/useService'
import { useSubtitlesAvailable } from '../../hooks/useSubtitlesAvailable'
import { cn } from '../../lib/cn'
import { aSegundos, formatear } from '../../lib/time'
import { rutas } from '../../lib/routes'
import { channelService, sessionService } from '../../services'
import { voiceService } from '../../services/voiceService'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import type { Canal, Segmento, SesionVoz } from '../../types'

/** Segmentos que ya están "dichos" al entrar a la sala (coincide con el Figma). */
const SEGMENTOS_INICIALES = 4
const NUEVO_SEGMENTO_CADA_MS = 8000

/**
 * Canal de voz (Figma 12–16): cuadrícula de participantes, controles flotantes,
 * transcripción en vivo y flujo de grabación con consentimiento.
 *
 * Estados de demo por URL (?demo=…):
 *   sin-subtitulos → Figma 13     rechazo → Figma 14
 *   solicitud      → Figma 15     grabando → Figma 16
 */
export default function VoiceChannel({ canal }: { canal: Canal }) {
  const { serverId = '' } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const demo = params.get('demo')

  const yoUid = useAuthStore((s) => s.usuario?.uid) ?? ''
  const notify = useUiStore((s) => s.notify)
  const confirm = useUiStore((s) => s.confirm)

  const participantes = useMemo(() => voiceService.participants(canal.canalId, yoUid), [canal.canalId, yoUid])
  const sesionId = voiceService.liveSessionId(canal.canalId)

  const { data: sesion, loading } = useService<SesionVoz | null>(() => (sesionId ? sessionService.getById(sesionId) : Promise.resolve(null)), [sesionId])
  const { data: todos } = useService<Segmento[]>(() => (sesionId ? sessionService.getSegments(sesionId) : Promise.resolve([])), [sesionId])

  const [yoSilenciado, setYoSilenciado] = useState(false)
  const [subtitulosActivos, setSubtitulosActivos] = useState(true)
  const [panelAbierto, setPanelAbierto] = useState(true)
  const [visibles, setVisibles] = useState(SEGMENTOS_INICIALES)
  // undefined = selección por defecto (la tercera intervención, como en Figma); null = ninguna.
  const [seleccion, setSeleccion] = useState<string | null | undefined>(undefined)
  const [extra, setExtra] = useState(0)

  const disponibles = useSubtitlesAvailable(demo === 'sin-subtitulos')
  const grabacion = useRecordingFlow({ yoUid, participantes, demo })

  // Cronómetro de la llamada: parte de la duración que trae la sesión.
  useEffect(() => {
    const t = setInterval(() => setExtra((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Transcripción "en vivo": cada cierto tiempo llega la siguiente intervención.
  const total = todos?.length ?? 0
  useEffect(() => {
    if (!disponibles || visibles >= total) return
    const t = setTimeout(() => setVisibles((v) => v + 1), NUEVO_SEGMENTO_CADA_MS)
    return () => clearTimeout(t)
  }, [disponibles, visibles, total])

  if (loading && sesionId) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-small text-muted">
        <Loader2 className="size-4 animate-spin" /> Conectando a {canal.nombre}…
      </div>
    )
  }

  const segmentos = disponibles ? (todos ?? []).slice(0, visibles) : []
  const ultimo = segmentos[segmentos.length - 1]
  const seleccionadoId = seleccion === undefined ? (segmentos[2]?.segmentoId ?? null) : seleccion
  const segSeleccionado = segmentos.find((g) => g.segmentoId === seleccionadoId)
  const subtitulosVisibles = subtitulosActivos && disponibles

  const tiempo = formatear((sesion ? aSegundos(sesion.duracion) : 0) + extra)
  const estaSilenciado = (uid: string) => (uid === yoUid ? yoSilenciado : voiceService.isMuted(uid))

  const alternarSubtitulos = () => {
    if (!disponibles) {
      notify('error', 'Subtítulos no disponibles', 'Revisa los permisos del micrófono en tu navegador.')
      return
    }
    setSubtitulosActivos((v) => !v)
  }

  const revisarPermisos = () =>
    notify('info', 'Permite el micrófono en tu navegador', 'Haz clic en el candado junto a la dirección, activa «Micrófono» y recarga la página.')

  const manejarGrabar = async () => {
    if (grabacion.fase === 'inactiva') return grabacion.solicitar()
    if (grabacion.fase === 'grabando') {
      const ok = await confirm({
        titulo: '¿Detener la grabación?',
        descripcion: 'La grabación se guardará y la encontrarás en Grabaciones.',
        confirmar: 'Detener',
        peligro: true,
      })
      if (ok) grabacion.detener()
      return
    }
    grabacion.abrirDialogo()
  }

  const salir = async () => {
    if (grabacion.fase === 'grabando') {
      const ok = await confirm({
        titulo: '¿Salir de la llamada?',
        descripcion: 'La grabación seguirá activa para las demás personas.',
        confirmar: 'Salir',
        peligro: true,
      })
      if (!ok) return
    }
    notify('info', `Saliste de ${canal.nombre}`)
    const primerTexto = channelService.listByServer(serverId).find((c) => c.tipo === 'texto')?.canalId ?? 'general'
    navigate(rutas.canal(serverId, primerTexto))
  }

  const mostrarDialogo = grabacion.dialogoAbierto && (grabacion.fase === 'esperando' || grabacion.fase === 'respondiendo')

  return (
    <div className="flex h-full min-h-0">
      <section className="relative flex min-w-0 flex-1 flex-col">
        <CallHeader
          nombre={canal.nombre}
          tiempo={tiempo}
          subtitulos={subtitulosVisibles}
          onSubtitulos={alternarSubtitulos}
          panelAbierto={panelAbierto}
          onPanel={() => setPanelAbierto((v) => !v)}
        />
        {grabacion.fase === 'grabando' && <RecordingBanner tiempo={formatear(grabacion.segundos)} />}

        <div className="min-h-0 flex-1 px-6 pt-6 pb-28">
          <div className={cn('grid h-full auto-rows-fr gap-4', participantes.length === 1 ? 'mx-auto max-w-3xl grid-cols-1' : participantes.length > 4 ? 'grid-cols-3' : 'grid-cols-2')}>
            {participantes.map((uid) => {
              const silenciado = estaSilenciado(uid)
              const hablando = !silenciado && ultimo?.hablanteUid === uid
              const seleccionado = subtitulosVisibles && segSeleccionado?.hablanteUid === uid
              let subtitulo: string | undefined
              if (subtitulosVisibles) {
                if (seleccionado) subtitulo = segSeleccionado?.texto
                else if (hablando) subtitulo = ultimo?.texto
              }
              return <ParticipantTile key={uid} uid={uid} esYo={uid === yoUid} silenciado={silenciado} hablando={hablando} seleccionado={seleccionado} subtitulo={subtitulo} />
            })}
          </div>
        </div>

        <ControlBar
          silenciado={yoSilenciado}
          onMic={() => setYoSilenciado((v) => !v)}
          onAjustes={() => notify('info', 'Ajustes de audio', 'Elegir micrófono y altavoces estará disponible en la siguiente entrega.')}
          subtitulos={subtitulosVisibles}
          onSubtitulos={alternarSubtitulos}
          onParticipantes={() => notify('info', `${participantes.length} personas en la llamada`)}
          fase={grabacion.fase}
          onGrabar={manejarGrabar}
          onSalir={salir}
        />
      </section>

      {panelAbierto && (
        <TranscriptPanel
          segmentos={segmentos}
          seleccionadoId={seleccionadoId}
          onSeleccionar={(id) => setSeleccion(id === seleccionadoId ? null : id)}
          onCerrar={() => setPanelAbierto(false)}
          disponible={disponibles}
          enVivo={Boolean(sesionId)}
          onRevisarPermisos={revisarPermisos}
        />
      )}

      {mostrarDialogo && (
        <RecordingDialog
          modo={grabacion.solicitanteUid === yoUid ? 'solicitante' : 'participante'}
          yoUid={yoUid}
          solicitanteUid={grabacion.solicitanteUid}
          participantes={participantes}
          estados={grabacion.estados}
          onCancelar={grabacion.cancelar}
          onAceptar={grabacion.aceptar}
          onRechazar={grabacion.rechazar}
          onCerrar={grabacion.cerrarDialogo}
        />
      )}
    </div>
  )
}