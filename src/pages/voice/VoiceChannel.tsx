import { Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import AjustesAudio from './AjustesAudio'
import AudioRemoto from './AudioRemoto'
import AvisoConexion from './AvisoConexion'
import AvisoMicrofono from './AvisoMicrofono'
import CallHeader from './CallHeader'
import ControlBar from './ControlBar'
import ParticipantTile from './ParticipantTile'
import RecordingBanner from './RecordingBanner'
import RecordingDialog from './RecordingDialog'
import TranscriptPanel from './TranscriptPanel'
import { useAudioLlamada } from '../../hooks/useAudioLlamada'
import { useMicrofono } from '../../hooks/useMicrofono'
import { useRecordingFlow } from '../../hooks/useRecordingFlow'
import { useSalaVoz } from '../../hooks/useSalaVoz'
import { useSubtitlesAvailable } from '../../hooks/useSubtitlesAvailable'
import Button from '../../components/ui/Button'
import { cn } from '../../lib/cn'
import { formatear } from '../../lib/time'
import { rutas } from '../../lib/routes'
import { channelService, sessionService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import type { Canal, Segmento } from '../../types'

/**
 * Canal de voz (Figma 12–16): cuadrícula de participantes, controles flotantes,
 * transcripción en vivo y flujo de grabación con consentimiento.
 *
 * Los participantes llegan del servidor de socket.io (TW 12 y 14), el audio
 * va directo entre navegadores con webrtc (TW 13) y la transcripcion se lee
 * de firestore en vivo (TW 17).
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

  const mic = useMicrofono()
  const sala = useSalaVoz(serverId, canal.canalId, { silenciado: mic.silenciado, hablando: mic.hablando })

  // siempre te ves a ti aunque todavia no haya conexion con el servidor
  const participantes = useMemo(() => {
    const ids = sala.participantes.map((p) => p.uid)
    return !yoUid || ids.includes(yoUid) ? ids : [...ids, yoUid]
  }, [sala.participantes, yoUid])
  const datosDe = (uid: string) => sala.participantes.find((p) => p.uid === uid)

  // audio con las demas personas
  const audio = useAudioLlamada({
    yoUid,
    miConexion: sala.conexion,
    participantes: sala.participantes,
    conectado: sala.estado === 'conectado',
    pista: mic.pista,
  })
  const [audioBloqueado, setAudioBloqueado] = useState(false)
  // cambia al pulsar "Activar audio" para volver a intentar reproducir
  const [activarAudio, setActivarAudio] = useState(0)

  const [ajustesAbiertos, setAjustesAbiertos] = useState(false)
  const [subtitulosActivos, setSubtitulosActivos] = useState(true)
  const [panelAbierto, setPanelAbierto] = useState(true)
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [todos, setTodos] = useState<Segmento[]>([])
  const [ahora, setAhora] = useState(() => Date.now())

  const disponibles = useSubtitlesAvailable(demo === 'sin-subtitulos')
  const grabacion = useRecordingFlow({ yoUid, participantes, demo })

  // cronometro de la llamada
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // transcripcion en vivo de la sesion actual
  useEffect(() => {
    if (!sala.sesionId) return
    return sessionService.listenSegments(serverId, sala.sesionId, setTodos)
  }, [serverId, sala.sesionId])

  const segmentos = disponibles && sala.sesionId ? todos : []
  const ultimo = segmentos[segmentos.length - 1]
  const segSeleccionado = segmentos.find((g) => g.segmentoId === seleccion)
  const seleccionadoId = segSeleccionado ? seleccion : null
  const subtitulosVisibles = subtitulosActivos && disponibles

  const tiempo = formatear(sala.inicio ? Math.max(0, Math.floor((ahora - sala.inicio) / 1000)) : 0)
  const estaSilenciado = (uid: string) => (uid === yoUid ? mic.silenciado : Boolean(datosDe(uid)?.silenciado))

  const alternarMicrofono = () => {
    if (mic.listo) {
      mic.alternarSilencio()
      return
    }
    if (mic.estado === 'denegado') {
      notify('error', 'El micrófono está bloqueado', 'Actívalo desde el candado junto a la dirección y pulsa «Reintentar».')
      return
    }
    if (mic.estado === 'no-soportado') {
      notify('error', 'Micrófono no disponible', 'Tu navegador no permite usar el micrófono en esta página.')
      return
    }
    mic.reintentar()
  }

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
        <AvisoConexion estado={sala.estado} error={sala.error} onReintentar={sala.reintentar} />
        <AvisoMicrofono estado={mic.estado} onReintentar={mic.reintentar} />
        {audioBloqueado && (
          <div role="status" className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
            <Volume2 className="size-5 shrink-0 text-primary" />
            <p className="flex-1 text-small">Tu navegador pausó el audio de la llamada.</p>
            <Button
              size="sm"
              onClick={() => {
                setAudioBloqueado(false)
                setActivarAudio((n) => n + 1)
              }}
            >
              Activar audio
            </Button>
          </div>
        )}
        {Object.entries(audio.remotos).map(([uid, stream]) => (
          <AudioRemoto key={uid} stream={stream} activar={activarAudio} onBloqueado={() => setAudioBloqueado(true)} />
        ))}

        <div className="min-h-0 flex-1 px-6 pt-6 pb-28">
          <div className={cn('grid h-full auto-rows-fr gap-4', participantes.length === 1 ? 'mx-auto max-w-3xl grid-cols-1' : participantes.length > 4 ? 'grid-cols-3' : 'grid-cols-2')}>
            {participantes.map((uid) => {
              const silenciado = estaSilenciado(uid)
              // tu tarjeta usa el nivel real del microfono, las demas lo que avisa el servidor
              const hablando = uid === yoUid ? mic.hablando : !silenciado && Boolean(datosDe(uid)?.hablando)
              const reconectando = uid === yoUid ? sala.estado === 'reconectando' : Boolean(datosDe(uid)?.reconectando)
              // el audio con esa persona todavia no conecta
              const estadoAudio = audio.estados[uid]
              const senalDebil = uid !== yoUid && !reconectando && estadoAudio !== undefined && estadoAudio !== 'connected'
              const seleccionado = subtitulosVisibles && segSeleccionado?.hablanteUid === uid
              let subtitulo: string | undefined
              if (subtitulosVisibles) {
                if (seleccionado) subtitulo = segSeleccionado?.texto
                else if (ultimo?.hablanteUid === uid) subtitulo = ultimo.texto
              }
              return (
                <ParticipantTile key={uid} uid={uid} esYo={uid === yoUid} silenciado={silenciado} hablando={hablando} seleccionado={seleccionado} subtitulo={subtitulo} reconectando={reconectando} senalDebil={senalDebil} />
              )
            })}
          </div>
        </div>

        <ControlBar
          silenciado={mic.silenciado}
          onMic={alternarMicrofono}
          onAjustes={() => setAjustesAbiertos(true)}
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
          enVivo={Boolean(sala.sesionId)}
          onRevisarPermisos={revisarPermisos}
        />
      )}

      {ajustesAbiertos && <AjustesAudio mic={mic} onClose={() => setAjustesAbiertos(false)} />}

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