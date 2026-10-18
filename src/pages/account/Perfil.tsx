import { Calendar, ChevronDown, Clock, LogOut, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import GoogleLogo from '../../components/ui/GoogleLogo'
import Switch from '../../components/ui/Switch'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { miembros } from '../../mocks/data'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'

const IDIOMAS = ['Español (México)', 'Español (España)', 'English (United States)', 'Português (Brasil)']
const TAMANOS = ['Pequeño', 'Mediano', 'Grande'] as const

interface Preferencias {
  nombre: string
  usuario: string
  estado: string
  subtitulos: boolean
  idioma: string
  tamano: (typeof TAMANOS)[number]
  menciones: boolean
  transcripciones: boolean
}

/**
 * Figma 28 · Perfil. Responsable: Carlos.
 * Los cambios se aplican al usuario en memoria (el nombre se ve al instante en la
 * barra lateral) y se confirma con un toast; nada se envía a un servidor.
 */
export default function Perfil() {
  useDocumentTitle('Tu perfil')
  const usuario = useAuthStore((s) => s.usuario)!
  const actualizarPerfil = useAuthStore((s) => s.actualizarPerfil)
  const logout = useAuthStore((s) => s.logout)
  const notify = useUiStore((s) => s.notify)
  const confirm = useUiStore((s) => s.confirm)
  const navigate = useNavigate()

  const inicial: Preferencias = {
    nombre: usuario.nombre,
    usuario: usuario.usuario,
    estado: usuario.estadoTexto ?? 'Revisando entregas',
    subtitulos: true,
    idioma: IDIOMAS[0],
    tamano: 'Mediano',
    menciones: true,
    transcripciones: false,
  }
  const [guardado, setGuardado] = useState(inicial)
  const [form, setForm] = useState(inicial)
  const set = <K extends keyof Preferencias>(k: K, v: Preferencias[K]) => setForm((f) => ({ ...f, [k]: v }))

  const cambios = JSON.stringify(form) !== JSON.stringify(guardado)
  const errorNombre = form.nombre.trim().length < 2 ? 'Mínimo 2 caracteres.' : undefined
  const errorUsuario = /^[a-z0-9.]{3,}$/.test(form.usuario) ? undefined : 'Mínimo 3: minúsculas, números y puntos.'
  const servidores = miembros.filter((m) => m.uid === usuario.uid).length

  const guardar = () => {
    if (errorNombre || errorUsuario) return
    actualizarPerfil({ nombre: form.nombre.trim(), usuario: form.usuario, estadoTexto: form.estado })
    setGuardado(form)
    notify('exito', 'Cambios guardados', 'Tu perfil y tus preferencias se actualizaron.')
  }

  const cerrarSesion = async () => {
    const ok = await confirm({
      titulo: '¿Cerrar sesión?',
      descripcion: 'Saldrás de TalkWith en este navegador. Puedes volver a entrar con tu cuenta de Google cuando quieras.',
      confirmar: 'Cerrar sesión',
    })
    if (!ok) return
    logout()
    navigate(rutas.login)
  }

  return (
    <div className="flex flex-col gap-6 px-12 pt-9 pb-8">
      <h1 className="text-title font-bold">Tu perfil</h1>

      <div className="flex items-start gap-6">
        {/* Tarjeta de usuario */}
        <aside className="flex w-[300px] shrink-0 flex-col items-center gap-3.5 rounded-2xl border border-line bg-panel p-6">
          <Avatar uid={usuario.uid} size="xl" presencia />
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-heading font-semibold">{usuario.nombre}</p>
            <p className="text-small text-muted">@{usuario.usuario}</p>
          </div>
          <Badge tone="online" dot>En línea</Badge>
          <hr className="w-full border-line" />
          <ul className="flex w-full flex-col gap-3 text-small text-muted">
            <Dato icono={<GoogleLogo size={16} />}>{usuario.correo}</Dato>
            <Dato icono={<Calendar className="size-4" />}>Miembro desde sep. 2026</Dato>
            <Dato icono={<Users className="size-4" />}>{servidores} servidores</Dato>
            <Dato icono={<Clock className="size-4" />}>12 h en llamadas este mes</Dato>
          </ul>
          <hr className="w-full border-line" />
          <Button variant="secundario" block icon={<LogOut className="size-4" />} onClick={cerrarSesion}>
            Cerrar sesión
          </Button>
        </aside>

        {/* Preferencias */}
        <section className="flex min-w-0 flex-1 flex-col gap-5 rounded-2xl border border-line bg-panel p-6">
          <h2 className="text-subtitle font-semibold">Información personal</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Nombre visible" value={form.nombre} maxLength={32} onChange={(e) => set('nombre', e.target.value)} error={errorNombre} />
            <Field label="Nombre de usuario" value={form.usuario} spellCheck={false} onChange={(e) => set('usuario', e.target.value.replace(/^@/, '').toLowerCase())} error={errorUsuario} />
            <Field label="Estado" value={form.estado} maxLength={40} placeholder="¿Qué estás haciendo?" onChange={(e) => set('estado', e.target.value)} />
          </div>

          <hr className="border-line" />
          <h2 className="text-subtitle font-semibold">Subtítulos y transcripción</h2>
          <Ajuste titulo="Mostrar subtítulos en las llamadas" descripcion="El texto aparece sobre el avatar de quien habla.">
            <Switch checked={form.subtitulos} onChange={(v) => set('subtitulos', v)} label="Mostrar subtítulos en las llamadas" />
          </Ajuste>
          <Ajuste titulo="Idioma de reconocimiento" descripcion="Idioma que usará tu navegador para reconocer tu voz.">
            <div className="relative">
              <select
                value={form.idioma}
                onChange={(e) => set('idioma', e.target.value)}
                aria-label="Idioma de reconocimiento"
                className="h-10 w-56 cursor-pointer appearance-none rounded-[10px] border border-line bg-raised pr-9 pl-3 text-small focus:border-primary focus:outline-none"
              >
                {IDIOMAS.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
            </div>
          </Ajuste>
          <Ajuste titulo="Tamaño de los subtítulos" descripcion="Ajusta la lectura según tu pantalla.">
            <div role="radiogroup" aria-label="Tamaño de los subtítulos" className="flex gap-1 rounded-[10px] bg-base p-1">
              {TAMANOS.map((t) => (
                <button
                  key={t}
                  role="radio"
                  aria-checked={form.tamano === t}
                  onClick={() => set('tamano', t)}
                  className={cn('rounded-lg px-3 py-1.5 text-caption', form.tamano === t ? 'bg-raised text-fg' : 'text-muted hover:text-fg')}
                >
                  {t}
                </button>
              ))}
            </div>
          </Ajuste>
          <div className="rounded-xl bg-base/60 px-4 py-3">
            <p className="mb-1 text-caption text-muted">Vista previa</p>
            <p className={cn('font-medium', { Pequeño: 'text-small', Mediano: 'text-body', Grande: 'text-heading' }[form.tamano], !form.subtitulos && 'text-muted line-through')}>
              <span className="text-voice">Sofía:</span> creo que el flujo de permisos debería explicar por qué pedimos el micrófono.
            </p>
          </div>

          <hr className="border-line" />
          <h2 className="text-subtitle font-semibold">Notificaciones</h2>
          <Ajuste titulo="Menciones y respuestas" descripcion="Te avisamos cuando alguien te menciona en un canal.">
            <Switch checked={form.menciones} onChange={(v) => set('menciones', v)} label="Menciones y respuestas" />
          </Ajuste>
          <Ajuste titulo="Nuevas transcripciones" descripcion="Aviso cuando termina una sesión en la que participaste.">
            <Switch checked={form.transcripciones} onChange={(v) => set('transcripciones', v)} label="Nuevas transcripciones" />
          </Ajuste>

          <div className="flex items-center justify-end gap-3 pt-2">
            {cambios && <span className="mr-auto text-small text-warning">Tienes cambios sin guardar</span>}
            <Button variant="secundario" disabled={!cambios} onClick={() => setForm(guardado)}>
              Descartar
            </Button>
            <Button disabled={!cambios || Boolean(errorNombre || errorUsuario)} onClick={guardar}>
              Guardar cambios
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

function Dato({ icono, children }: { icono: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="flex w-4 justify-center">{icono}</span>
      <span className="truncate">{children}</span>
    </li>
  )
}

function Ajuste({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="flex flex-col gap-0.5">
        <p className="text-small font-medium">{titulo}</p>
        <p className="text-caption text-muted">{descripcion}</p>
      </div>
      {children}
    </div>
  )
}
