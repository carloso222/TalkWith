import { Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Checkbox from '../../components/ui/Checkbox'
import { Field } from '../../components/ui/Field'
import GoogleLogo from '../../components/ui/GoogleLogo'
import Logo from '../../components/ui/Logo'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rutas } from '../../lib/routes'
import { CURRENT_UID, usuarios } from '../../mocks/data'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { Halos } from './Login'

const MAX_NOMBRE = 32
const USUARIOS_OCUPADOS = usuarios.filter((u) => u.uid !== CURRENT_UID).map((u) => u.usuario)

/** Datos que "regresa Google" en la primera entrada (simulados). */
const cuentaGoogle = usuarios.find((u) => u.uid === CURRENT_UID)!

function validarUsuario(valor: string): string | undefined {
  const limpio = valor.replace(/^@/, '')
  if (!limpio) return 'Elige un nombre de usuario.'
  if (!/^[a-z0-9.]+$/.test(limpio)) return 'Solo letras minúsculas, números y puntos.'
  if (limpio.length < 3) return 'Debe tener al menos 3 caracteres.'
  if (USUARIOS_OCUPADOS.includes(limpio)) return 'Ese nombre de usuario ya está en uso.'
}

/**
 * Figma 04 · Registro — completar perfil. Responsable: Carlos.
 * Se muestra la primera vez que alguien entra con Google: confirma su nombre
 * visible, elige un nombre de usuario único y acepta términos y la política de
 * grabación. No se guarda nada; al terminar se inicia la sesión simulada.
 */
export default function Registro() {
  useDocumentTitle('Completa tu perfil')
  const navigate = useNavigate()
  const completarPerfil = useAuthStore((s) => s.completarPerfil)
  const notify = useUiStore((s) => s.notify)

  const [nombre, setNombre] = useState(cuentaGoogle.nombre)
  const [usuario, setUsuario] = useState(`@${cuentaGoogle.usuario}`)
  const [terminos, setTerminos] = useState(false)
  const [grabacion, setGrabacion] = useState(false)
  const [tocado, setTocado] = useState({ nombre: false, usuario: false })
  const [enviando, setEnviando] = useState(false)

  const errorNombre = nombre.trim().length < 2 ? 'Escribe cómo quieres que te vean (mínimo 2 caracteres).' : undefined
  const errorUsuario = validarUsuario(usuario)
  const valido = !errorNombre && !errorUsuario && terminos && grabacion

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    setTocado({ nombre: true, usuario: true })
    if (!valido) return
    setEnviando(true)
    setTimeout(() => {
      completarPerfil()
      notify('exito', '¡Bienvenido a TalkWith!', 'Tu cuenta está lista. Crea un servidor o únete con una invitación.')
      navigate(rutas.inicio, { replace: true })
    }, 900)
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-6">
      <Halos />
      <div className="relative flex w-full max-w-[460px] flex-col items-center gap-4">
        <Link to={rutas.landing} className="flex items-center gap-2.5" aria-label="TalkWith, ir al inicio">
          <Logo size={36} />
          <span className="text-heading font-bold">TalkWith</span>
        </Link>

        <form onSubmit={enviar} noValidate className="flex w-full flex-col gap-4 rounded-2xl border border-line bg-panel px-8 py-7 shadow-low">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-title font-bold">Completa tu perfil</h1>
            <p className="text-muted">Así te verán en tus servidores. Solo te lo pediremos una vez.</p>
          </div>

          <div className="flex items-center gap-4">
            <Avatar uid={CURRENT_UID} size="lg" />
            <div className="flex flex-col gap-1">
              <p className="text-small font-medium">Foto de tu cuenta de Google</p>
              <button type="button" onClick={() => notify('info', 'Cambiar foto', 'En esta entrega la foto se toma de tu cuenta de Google.')} className="self-start text-small font-medium text-primary hover:underline">
                Cambiar foto
              </button>
            </div>
          </div>

          <Field
            label="Nombre visible"
            value={nombre}
            maxLength={MAX_NOMBRE}
            autoComplete="name"
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => setTocado((t) => ({ ...t, nombre: true }))}
            error={tocado.nombre ? errorNombre : undefined}
            help={`${nombre.length} de ${MAX_NOMBRE} caracteres`}
          />

          <Field
            label="Nombre de usuario"
            value={usuario}
            autoComplete="username"
            spellCheck={false}
            onChange={(e) => setUsuario('@' + e.target.value.replace(/^@+/, '').toLowerCase())}
            onBlur={() => setTocado((t) => ({ ...t, usuario: true }))}
            error={tocado.usuario ? errorUsuario : undefined}
            help="Solo letras, números y puntos. Debe ser único."
          />

          <div className="flex flex-col gap-2">
            <span className="text-small font-medium">Correo</span>
            <div className="flex h-11 items-center gap-2.5 rounded-[10px] border border-line bg-base px-3.5 text-body text-muted">
              <GoogleLogo size={16} />
              <span className="flex-1 truncate">{cuentaGoogle.correo}</span>
              <Lock className="size-4" aria-label="No editable" />
            </div>
            <span className="text-caption text-muted">Vinculado con tu cuenta de Google</span>
          </div>

          <div className="flex flex-col gap-3">
            <Checkbox checked={terminos} onChange={setTerminos}>
              Acepto los <a href="#" className="text-fg underline">Términos de uso</a> y el <a href="#" className="text-fg underline">Aviso de privacidad</a> de TalkWith.
            </Checkbox>
            <Checkbox checked={grabacion} onChange={setGrabacion}>
              Entiendo que las llamadas pueden transcribirse y que una grabación solo inicia con el consentimiento de todos.
            </Checkbox>
            {tocado.usuario && (!terminos || !grabacion) && <p className="text-caption text-recording">Para continuar acepta ambas casillas.</p>}
          </div>

          <Button type="submit" block loading={enviando}>
            {enviando ? 'Creando tu cuenta' : 'Crear mi cuenta'}
          </Button>

          <p className="text-center text-small text-muted">
            ¿Ya tienes una cuenta?{' '}
            <Link to={rutas.login} className="font-medium text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
