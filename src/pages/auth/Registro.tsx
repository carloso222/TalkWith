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
import { hayErrores, REGLAS, validarRegistro } from '../../lib/validaciones'
import { ApiError, manejarError } from '../../services'
import { completarRegistro } from '../../services/perfilService'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { Halos } from './Login'

/**
 * Figma 04 · Registro — completar perfil. Responsable: Carlos.
 * Se muestra la primera vez que alguien entra con Google: confirma su nombre
 * visible, elige un nombre de usuario único y acepta términos y la política de
 * grabación. Los datos del perfil salen de la cuenta de Google (ya autenticada).
 */
export default function Registro() {
  useDocumentTitle('Completa tu perfil')
  const navigate = useNavigate()
  const cuenta = useAuthStore((s) => s.usuario)!
  const setSesion = useAuthStore((s) => s.setSesion)
  const notify = useUiStore((s) => s.notify)

  const [nombre, setNombre] = useState(cuenta.nombre)
  const [usuario, setUsuario] = useState('@')
  const [terminos, setTerminos] = useState(false)
  const [grabacion, setGrabacion] = useState(false)
  const [tocado, setTocado] = useState({ nombre: false, usuario: false, casillas: false })
  const [enviando, setEnviando] = useState(false)
  // error que regresa el servidor, por ejemplo usuario ocupado
  const [errorUsuarioServidor, setErrorUsuarioServidor] = useState('')

  const errores = validarRegistro({ nombre, usuario, terminos, grabacion })
  const errorNombre = tocado.nombre ? errores.nombre : undefined
  const errorUsuario = (tocado.usuario ? errores.usuario : undefined) ?? (errorUsuarioServidor || undefined)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setTocado({ nombre: true, usuario: true, casillas: true })
    if (hayErrores(errores)) return

    setEnviando(true)
    try {
      const registrada = await completarRegistro(cuenta, { nombre, usuario })
      setSesion(registrada, true)
      notify('exito', `¡Bienvenido a TalkWith, ${registrada.nombre.split(' ')[0]}!`, 'Tu cuenta está lista. Crea un servidor o únete con una invitación.')
      navigate(rutas.inicio, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.campo === 'usuario') setErrorUsuarioServidor(err.message)
      else manejarError(err, 'No pudimos crear tu cuenta')
      setEnviando(false)
    }
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
            <Avatar uid={cuenta.uid} size="lg" />
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
            maxLength={REGLAS.nombreMax}
            autoComplete="name"
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => setTocado({ ...tocado, nombre: true })}
            error={errorNombre}
            help={`${nombre.length} de ${REGLAS.nombreMax} caracteres`}
            disabled={enviando}
          />

          <Field
            label="Nombre de usuario"
            value={usuario}
            maxLength={REGLAS.usuarioMax + 1}
            autoComplete="username"
            spellCheck={false}
            onChange={(e) => {
              setUsuario('@' + e.target.value.replace(/^@+/, '').toLowerCase())
              setErrorUsuarioServidor('')
            }}
            onBlur={() => setTocado({ ...tocado, usuario: true })}
            error={errorUsuario}
            help="Solo letras, números y puntos. Debe ser único."
            disabled={enviando}
          />

          <div className="flex flex-col gap-2">
            <span className="text-small font-medium">Correo</span>
            <div className="flex h-11 items-center gap-2.5 rounded-[10px] border border-line bg-base px-3.5 text-body text-muted">
              <GoogleLogo size={16} />
              <span className="flex-1 truncate">{cuenta.correo}</span>
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
            {tocado.casillas && errores.casillas && <p className="text-caption text-recording">{errores.casillas}</p>}
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
