import { Copy, Download, FileText, Hash, Link2, MoreHorizontal, Paperclip, Pencil, RefreshCw, Reply, Search, SendHorizontal, Smile, Trash2, Users, WifiOff } from 'lucide-react'
import { Fragment, useCallback, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Avatar from '../../components/ui/Avatar'
import { useAutoScroll } from '../../hooks/useAutoScroll'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { channelService, messageService, userService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import type { Canal, Mensaje } from '../../types'
import ColumnaMiembros from './ColumnaMiembros'

/** Figma 10 · Canal de texto y 11 · Reconectando. Responsable: Isaian. */
export default function CanalTexto({ canal }: { canal: Canal }) {
  useDocumentTitle(`#${canal.nombre}`)
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)
  const notify = useUiStore((s) => s.notify)

  const { data, loading } = useService(() => messageService.getByChannel(canal.canalId), [canal.canalId])
  // Mensajes enviados en esta sesión, por canal: solo viven en memoria, no se mandan a ningún servidor.
  const [enviados, setEnviados] = useState<Record<string, Mensaje[]>>({})
  const mensajes = [...(data ?? []), ...(enviados[canal.canalId] ?? [])]

  const [verMiembros, setVerMiembros] = useState(true)
  const [reconectando, setReconectando] = useState(false)
  const [texto, setTexto] = useState('')
  const entrada = useRef<HTMLInputElement>(null)
  const lista = useAutoScroll<HTMLDivElement>(mensajes.length)

  // Quién está escribiendo (presencia simulada en mocks).
  const escribiendo = channelService.typing(canal.canalId).map((uid) => userService.find(uid)).filter((u) => u !== undefined)[0]

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const contenido = texto.trim()
    if (!contenido || !usuario) return
    const ahora = new Date()
    setEnviados((porCanal) => ({
      ...porCanal,
      [canal.canalId]: [
        ...(porCanal[canal.canalId] ?? []),
        { mensajeId: crypto.randomUUID(), canalId: canal.canalId, autorUid: usuario.uid, contenido, creadoEn: `${ahora.getHours()}:${String(ahora.getMinutes()).padStart(2, '0')}` },
      ],
    }))
    setTexto('')
    if (reconectando) notify('info', 'Mensaje en espera', 'Se enviará en cuanto vuelva la conexión.')
  }

  const reintentar = () => {
    notify('info', 'Reconectando…')
    setTimeout(() => {
      setReconectando(false)
      notify('exito', 'Conexión restablecida', 'Ya estás al día con los mensajes de #' + canal.nombre + '.')
    }, 1200)
  }

  const responder = (m: Mensaje) => {
    const nombre = userService.find(m.autorUid)?.nombre.split(' ')[0]
    setTexto(`@${nombre} `)
    entrada.current?.focus()
  }

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-5">
          <Hash className="size-5 shrink-0 text-muted" />
          <h1 className="text-subtitle font-semibold">{canal.nombre}</h1>
          {canal.descripcion && <p className="truncate border-l border-line pl-2.5 text-small text-muted">{canal.descripcion}</p>}
          <div className="ml-auto flex items-center gap-1 text-muted">
            <button onClick={() => navigate(rutas.buscar())} className="rounded-lg p-2 hover:bg-raised hover:text-fg" aria-label="Buscar">
              <Search className="size-5" />
            </button>
            <button
              onClick={() => setVerMiembros((v) => !v)}
              aria-pressed={verMiembros}
              className={cn('rounded-lg p-2 hover:bg-raised hover:text-fg', verMiembros && 'bg-raised text-fg')}
              aria-label="Mostrar miembros"
            >
              <Users className="size-5" />
            </button>
            <MenuCanal onSimular={() => setReconectando(true)} reconectando={reconectando} />
          </div>
        </header>

        {reconectando && (
          <div role="status" className="flex shrink-0 items-center gap-3 border-b border-warning/40 bg-warning/10 px-5 py-2.5 text-small text-warning">
            <RefreshCw className="size-[18px] shrink-0 animate-spin [animation-duration:2.5s]" />
            <p className="flex-1">Intentando reconectar. Los mensajes nuevos aparecerán cuando vuelva la conexión.</p>
            <button onClick={reintentar} className="h-8 shrink-0 rounded-lg border border-warning/50 px-3 font-medium hover:bg-warning/10">
              Reintentar ahora
            </button>
          </div>
        )}

        <div ref={lista} className="min-h-0 flex-1 overflow-y-auto pt-10 pb-2">
          {loading ? (
            <CargandoMensajes />
          ) : mensajes.length === 0 ? (
            <div className="flex flex-col gap-2 px-5 pt-20">
              <span className="flex size-14 items-center justify-center rounded-full bg-raised"><Hash className="size-7" /></span>
              <h2 className="text-title font-bold">Te damos la bienvenida a #{canal.nombre}</h2>
              <p className="text-muted">Este es el inicio del canal. {canal.descripcion}</p>
            </div>
          ) : (
            <>
              <div className="mx-5 mb-4 flex items-center gap-4 text-caption font-medium text-muted">
                <span className="h-px flex-1 bg-line" /> Hoy, 1 de octubre <span className="h-px flex-1 bg-line" />
              </div>
              {mensajes.map((m, i) => (
                <FilaMensaje key={m.mensajeId} mensaje={m} continua={mensajes[i - 1]?.autorUid === m.autorUid} miUid={usuario?.uid} onResponder={responder} />
              ))}
            </>
          )}
        </div>

        <div className="shrink-0 px-5 pb-5">
          <p className="flex h-6 items-center gap-1.5 text-caption text-muted" aria-live="polite">
            {escribiendo && !reconectando && (
              <>
                <span className="flex gap-0.5">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="size-1.5 animate-[typing_1.2s_ease-in-out_infinite] rounded-full bg-muted" style={{ animationDelay: `${d * 0.15}s` }} />
                  ))}
                </span>
                <span><strong className="font-semibold text-fg">{escribiendo.nombre.split(' ')[0]}</strong> está escribiendo…</span>
              </>
            )}
          </p>
          <form onSubmit={enviar} className="flex h-[52px] items-center gap-2 rounded-xl border border-line bg-raised pr-2 pl-3 focus-within:border-primary/70">
            <button type="button" onClick={() => notify('info', 'Adjuntar archivo', 'Los adjuntos se habilitan en la siguiente entrega.')} className="rounded-lg p-1.5 text-muted hover:text-fg" aria-label="Adjuntar archivo">
              <Paperclip className="size-5" />
            </button>
            <input
              ref={entrada}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={reconectando ? 'Puedes escribir; se enviará al reconectar' : `Enviar mensaje a #${canal.nombre}`}
              className="h-full min-w-0 flex-1 bg-transparent text-body placeholder:text-muted focus:outline-none"
              aria-label={`Mensaje para #${canal.nombre}`}
            />
            <button type="button" className="rounded-lg p-1.5 text-muted hover:text-fg" aria-label="Emoji">
              <Smile className="size-5" />
            </button>
            <button type="submit" disabled={!texto.trim()} className={cn('flex size-9 items-center justify-center rounded-lg bg-primary text-white transition-opacity hover:bg-primary/90 disabled:opacity-60', reconectando && 'opacity-50')} aria-label="Enviar">
              <SendHorizontal className="size-[18px]" />
            </button>
          </form>
        </div>
      </section>

      {verMiembros && <ColumnaMiembros servidorId={canal.servidorId} />}
    </div>
  )
}

/** Un mensaje del canal. `continua` = mismo autor que el anterior (sin avatar ni nombre). */
function FilaMensaje({ mensaje: m, continua, miUid, onResponder }: { mensaje: Mensaje; continua: boolean; miUid?: string; onResponder: (m: Mensaje) => void }) {
  const autor = userService.find(m.autorUid)
  const notify = useUiStore((s) => s.notify)
  const confirm = useUiStore((s) => s.confirm)
  const meMencionan = Boolean(miUid && m.menciones?.includes(miUid))

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(m.contenido)
    } catch {
      /* el portapapeles puede no estar disponible; el toast basta para la demo */
    }
    notify('info', 'Mensaje copiado')
  }

  const eliminar = async () => {
    const ok = await confirm({
      titulo: '¿Eliminar este mensaje?',
      descripcion: 'Se quitará del canal para todas las personas. Esta acción no se puede deshacer.',
      confirmar: 'Eliminar mensaje',
      peligro: true,
    })
    // Igual que en Grabaciones: se pregunta, pero no se borra nada.
    if (ok) notify('exito', 'Mensaje eliminado', 'Es solo una demostración: no se borró ningún registro.')
  }

  return (
    <article className={cn('group relative flex gap-3.5 px-5 py-1', !continua && 'mt-3', meMencionan ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-raised/40')}>
      <div className="w-10 shrink-0">{!continua && <Avatar uid={m.autorUid} />}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {!continua && (
          <p className="flex items-baseline gap-2">
            <span className="text-body font-medium">{autor?.nombre}</span>
            <time className="text-caption text-muted">{m.creadoEn}</time>
          </p>
        )}
        <p className="text-body break-words">
          <ContenidoConMenciones texto={m.contenido} />
        </p>
        {m.adjunto?.tipo === 'archivo' && (
          <div className="mt-1.5 mb-1 flex max-w-[380px] items-center gap-3 rounded-xl border border-line bg-panel p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><FileText className="size-5" /></span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-small font-medium">{m.adjunto.titulo}</span>
              <span className="text-caption text-muted">{m.adjunto.detalle}</span>
            </span>
            <button onClick={() => notify('info', `Descargando ${m.adjunto!.titulo}`, 'Descarga simulada: no se transfirió ningún archivo.')} className="rounded-lg p-2 text-muted hover:bg-raised hover:text-fg" aria-label={`Descargar ${m.adjunto.titulo}`}>
              <Download className="size-[18px]" />
            </button>
          </div>
        )}
        {m.adjunto?.tipo === 'enlace' && (
          <div className="mt-1.5 mb-1 flex max-w-[440px] flex-col gap-1.5 rounded-xl border border-line bg-panel px-4 py-3">
            <span className="flex items-center gap-1.5 text-caption text-muted"><Link2 className="size-3.5 text-voice" /> {m.adjunto.url}</span>
            <span className="text-small font-medium text-primary">{m.adjunto.titulo}</span>
            <span className="text-small text-muted">{m.adjunto.detalle}</span>
          </div>
        )}
      </div>

      {/* Acciones al pasar el cursor (Figma 10) */}
      <div className="absolute -top-4 right-5 hidden items-center gap-0.5 rounded-lg border border-line bg-panel p-1 shadow-low group-focus-within:flex group-hover:flex">
        <AccionMensaje label="Responder" onClick={() => onResponder(m)}><Reply className="size-4" /></AccionMensaje>
        <AccionMensaje label="Copiar texto" onClick={copiar}><Copy className="size-4" /></AccionMensaje>
        <AccionMensaje label="Editar" onClick={() => notify('info', 'Editar mensaje', 'La edición se habilita cuando haya conexión con el servidor.')}><Pencil className="size-4" /></AccionMensaje>
        <AccionMensaje label="Eliminar" onClick={eliminar} peligro><Trash2 className="size-4" /></AccionMensaje>
      </div>
    </article>
  )
}

function AccionMensaje({ label, onClick, peligro, children }: { label: string; onClick: () => void; peligro?: boolean; children: ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={cn('rounded-md p-1.5 hover:bg-raised', peligro ? 'text-recording' : 'text-muted hover:text-fg')}>
      {children}
    </button>
  )
}

/** Resalta las menciones (@Carlos) como en el Figma. */
function ContenidoConMenciones({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(@[\p{L}]+)/u).map((parte, i) =>
        parte.startsWith('@') ? (
          <span key={i} className="rounded bg-primary/25 px-1 py-px font-medium text-indigo-200">{parte}</span>
        ) : (
          <Fragment key={i}>{parte}</Fragment>
        ),
      )}
    </>
  )
}

/** Menú "…" del encabezado: permite simular la pérdida de conexión (Figma 11). */
function MenuCanal({ onSimular, reconectando }: { onSimular: () => void; reconectando: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = useCallback(() => setAbierto(false), [])
  const ref = useClickOutside<HTMLDivElement>(cerrar, abierto)
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="rounded-lg p-2 hover:bg-raised hover:text-fg" aria-label="Más opciones">
        <MoreHorizontal className="size-5" />
      </button>
      {abierto && (
        <div className="animate-dialog-in absolute top-11 right-0 z-30 w-60 rounded-xl border border-line bg-panel p-1.5 text-fg shadow-high">
          <button
            disabled={reconectando}
            onClick={() => {
              onSimular()
              cerrar()
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-small hover:bg-raised disabled:opacity-50"
          >
            <WifiOff className="size-4 text-warning" /> Simular pérdida de conexión
          </button>
        </div>
      )}
    </div>
  )
}

function CargandoMensajes() {
  return (
    <div className="flex flex-col gap-6 px-5" aria-label="Cargando mensajes">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse gap-3.5">
          <span className="size-10 rounded-full bg-raised" />
          <span className="flex flex-1 flex-col gap-2 pt-1">
            <span className="h-3 w-40 rounded bg-raised" />
            <span className="h-3 w-3/4 rounded bg-raised" />
          </span>
        </div>
      ))}
    </div>
  )
}
