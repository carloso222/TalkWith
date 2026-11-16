import { Copy, Download, FileText, Hash, Link2, Paperclip, Pencil, RefreshCw, Reply, Search, SendHorizontal, Smile, Trash2, Users, WifiOff } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Avatar from '../../components/ui/Avatar'
import { useAutoScroll } from '../../hooks/useAutoScroll'
import { useCanalTexto, type MensajeVista } from '../../hooks/useCanalTexto'
import { useCurrentRole } from '../../hooks/useCurrentRole'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { diaMensaje } from '../../lib/time'
import { channelService, userService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import type { Canal, Mensaje } from '../../types'
import ColumnaMiembros from './ColumnaMiembros'

// fecha de calendario de un mensaje, para separar por dia
const diaDe = (m: Mensaje) => (m.creadoMs ? new Date(m.creadoMs).toDateString() : '')

/** Figma 10 · Canal de texto y 11 · Reconectando. Responsable: Isaian. Mensajes reales por socket.io (TW 09). */
export default function CanalTexto({ canal }: { canal: Canal }) {
  useDocumentTitle(`#${canal.nombre}`)
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)
  const notify = useUiStore((s) => s.notify)

  const chat = useCanalTexto(canal.servidorId, canal.canalId, usuario?.uid ?? '')
  const mensajes = chat.mensajes
  const reconectando = chat.estado === 'reconectando'
  // propietario y admin pueden borrar mensajes de cualquiera (igual que las reglas)
  const rol = useCurrentRole(canal.servidorId)
  const soyGestor = rol === 'propietario' || rol === 'admin'

  const [verMiembros, setVerMiembros] = useState(true)
  const [texto, setTexto] = useState('')
  // mensaje que estoy editando (solo uno a la vez)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const lista = useAutoScroll<HTMLDivElement>(mensajes.length)

  // Quién está escribiendo (presencia simulada en mocks).
  const escribiendo = channelService.typing(canal.canalId).map((uid) => userService.find(uid)).filter((u) => u !== undefined)[0]

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    const contenido = texto.trim()
    if (!contenido || !usuario) return
    chat.enviar(contenido)
    setTexto('')
    if (chat.estado !== 'conectado') notify('info', 'Mensaje en espera', 'Se enviará en cuanto vuelva la conexión.')
  }

  const responder = (m: Mensaje) => {
    const nombre = userService.find(m.autorUid)?.nombre.split(' ')[0]
    setTexto(`@${nombre} `)
    entrada.current?.focus()
  }

  const terminarEdicion = () => {
    setEditandoId(null)
    entrada.current?.focus()
  }

  // con el campo vacío, la flecha arriba edita mi último mensaje (como en Discord)
  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' || texto) return
    const ultimo = [...mensajes].reverse().find((m) => m.autorUid === usuario?.uid && !m.enviando)
    if (!ultimo) return
    e.preventDefault()
    setEditandoId(ultimo.mensajeId)
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
          </div>
        </header>

        {reconectando && (
          <div role="status" className="flex shrink-0 items-center gap-3 border-b border-warning/40 bg-warning/10 px-5 py-2.5 text-small text-warning">
            <RefreshCw className="size-[18px] shrink-0 animate-spin [animation-duration:2.5s]" />
            <p className="flex-1">Intentando reconectar. Los mensajes nuevos aparecerán cuando vuelva la conexión.</p>
          </div>
        )}
        {chat.estado === 'error' && (
          <div role="alert" className="flex shrink-0 items-center gap-3 border-b border-recording/40 bg-recording/10 px-5 py-2.5 text-small text-recording">
            <WifiOff className="size-[18px] shrink-0" />
            <p className="flex-1">{chat.error} Los mensajes nuevos no llegarán hasta que se conecte.</p>
            <button onClick={chat.reintentar} className="h-8 shrink-0 rounded-lg border border-recording/50 px-3 font-medium hover:bg-recording/10">
              Reintentar ahora
            </button>
          </div>
        )}

        <div ref={lista} className="min-h-0 flex-1 overflow-y-auto pt-10 pb-2">
          {chat.cargando ? (
            <CargandoMensajes />
          ) : chat.errorCarga && mensajes.length === 0 ? (
            <p className="px-5 pt-20 text-center text-muted">No pudimos cargar los mensajes. {chat.errorCarga}</p>
          ) : mensajes.length === 0 ? (
            <div className="flex flex-col gap-2 px-5 pt-20">
              <span className="flex size-14 items-center justify-center rounded-full bg-raised"><Hash className="size-7" /></span>
              <h2 className="text-title font-bold">Te damos la bienvenida a #{canal.nombre}</h2>
              <p className="text-muted">Este es el inicio del canal. {canal.descripcion}</p>
            </div>
          ) : (
            mensajes.map((m, i) => {
              const anterior = mensajes[i - 1]
              // separador cuando cambia el dia
              const nuevoDia = !anterior || diaDe(anterior) !== diaDe(m)
              return (
                <Fragment key={m.mensajeId}>
                  {nuevoDia && Boolean(m.creadoMs) && (
                    <div className="mx-5 mt-4 mb-4 flex items-center gap-4 text-caption font-medium text-muted">
                      <span className="h-px flex-1 bg-line" /> {diaMensaje(new Date(m.creadoMs ?? 0))} <span className="h-px flex-1 bg-line" />
                    </div>
                  )}
                  <FilaMensaje
                    mensaje={m}
                    continua={!nuevoDia && anterior?.autorUid === m.autorUid}
                    miUid={usuario?.uid}
                    soyGestor={soyGestor}
                    editando={editandoId === m.mensajeId}
                    onResponder={responder}
                    onEditar={() => setEditandoId(m.mensajeId)}
                    onGuardar={async (contenido) => {
                      if (contenido.trim() === m.contenido) return terminarEdicion()
                      if (await chat.editar(m.mensajeId, contenido)) terminarEdicion()
                    }}
                    onCancelar={terminarEdicion}
                    onBorrar={() => chat.borrar(m.mensajeId)}
                  />
                </Fragment>
              )
            })
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
              onKeyDown={alTeclear}
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

interface PropsFila {
  mensaje: MensajeVista
  /** Mismo autor que el anterior (sin avatar ni nombre). */
  continua: boolean
  miUid?: string
  soyGestor: boolean
  editando: boolean
  onResponder: (m: Mensaje) => void
  onEditar: () => void
  onGuardar: (contenido: string) => Promise<void> | void
  onCancelar: () => void
  onBorrar: () => Promise<boolean>
}

/** Un mensaje del canal. */
function FilaMensaje({ mensaje: m, continua, miUid, soyGestor, editando, onResponder, onEditar, onGuardar, onCancelar, onBorrar }: PropsFila) {
  const autor = userService.find(m.autorUid)
  const notify = useUiStore((s) => s.notify)
  const confirm = useUiStore((s) => s.confirm)
  const meMencionan = Boolean(miUid && m.menciones?.includes(miUid))
  const esMio = Boolean(miUid) && m.autorUid === miUid
  // lo que todavia no confirma el servidor no se puede editar ni borrar
  const puedeEditar = esMio && !m.enviando
  const puedeBorrar = (esMio || soyGestor) && !m.enviando

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
      descripcion: esMio
        ? 'Se quitará del canal para todas las personas. Esta acción no se puede deshacer.'
        : `Vas a eliminar un mensaje de ${autor?.nombre ?? 'otra persona'}. Se quitará del canal para todas las personas.`,
      confirmar: 'Eliminar mensaje',
      peligro: true,
    })
    if (ok && (await onBorrar())) notify('exito', 'Mensaje eliminado')
  }

  return (
    <article className={cn('group relative flex gap-3.5 px-5 py-1', !continua && 'mt-3', meMencionan ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-raised/40', m.enviando && 'opacity-60')}>
      <div className="w-10 shrink-0">{!continua && <Avatar uid={m.autorUid} />}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {!continua && (
          <p className="flex items-baseline gap-2">
            <span className="text-body font-medium">{autor?.nombre}</span>
            <time className="text-caption text-muted">{m.creadoEn}</time>
          </p>
        )}
        {editando ? (
          <EditorMensaje inicial={m.contenido} onGuardar={onGuardar} onCancelar={onCancelar} />
        ) : (
          <p className="text-body break-words">
            <ContenidoConMenciones texto={m.contenido} />
            {m.editadoMs && (
              <span className="ml-1.5 text-caption text-muted" title={`Editado el ${new Date(m.editadoMs).toLocaleString('es-MX')}`}>
                (editado)
              </span>
            )}
            {m.enviando && <span className="ml-2 text-caption text-muted">Enviando…</span>}
          </p>
        )}
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

      {/* Acciones al pasar el cursor (Figma 10); mientras se edita no estorban */}
      {!m.enviando && !editando && (
        <div className="absolute -top-4 right-5 hidden items-center gap-0.5 rounded-lg border border-line bg-panel p-1 shadow-low group-focus-within:flex group-hover:flex">
          <AccionMensaje label="Responder" onClick={() => onResponder(m)}><Reply className="size-4" /></AccionMensaje>
          <AccionMensaje label="Copiar texto" onClick={copiar}><Copy className="size-4" /></AccionMensaje>
          {puedeEditar && <AccionMensaje label="Editar" onClick={onEditar}><Pencil className="size-4" /></AccionMensaje>}
          {puedeBorrar && <AccionMensaje label="Eliminar" onClick={eliminar} peligro><Trash2 className="size-4" /></AccionMensaje>}
        </div>
      )}
    </article>
  )
}

/** Campo para editar un mensaje en su lugar: Enter guarda, Esc cancela. */
function EditorMensaje({ inicial, onGuardar, onCancelar }: { inicial: string; onGuardar: (contenido: string) => Promise<void> | void; onCancelar: () => void }) {
  const [valor, setValor] = useState(inicial)
  const [guardando, setGuardando] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  // enfoca con el cursor al final, listo para seguir escribiendo
  useEffect(() => {
    const c = campo.current
    if (!c) return
    c.focus()
    c.setSelectionRange(c.value.length, c.value.length)
  }, [])

  const guardar = async () => {
    if (!valor.trim() || guardando) return
    setGuardando(true)
    try {
      await onGuardar(valor)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={campo}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void guardar()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancelar()
          }
        }}
        disabled={guardando}
        maxLength={4000}
        aria-label="Editar mensaje"
        className="h-10 rounded-lg border border-primary/60 bg-raised px-3 text-body focus:border-primary focus:outline-none"
      />
      <p className="text-caption text-muted">
        Esc para{' '}
        <button type="button" onClick={onCancelar} className="text-primary hover:underline">cancelar</button>
        {' · '}Enter para{' '}
        <button type="button" onClick={() => void guardar()} disabled={!valor.trim() || guardando} className="text-primary hover:underline disabled:opacity-50">
          {guardando ? 'guardando…' : 'guardar'}
        </button>
      </p>
    </div>
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
