import { AlertCircle, AudioLines, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import Button from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import Logo from '../../components/ui/Logo'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rutas } from '../../lib/routes'
import { hayErrores, validarLogin } from '../../lib/validaciones'
import { authService, mensajeDeError } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'

/**
 * Figma 02 · Inicio de sesión y 03 · Inicio de sesión — cargando.
 * Responsable: Carlos. Google sigue simulado; el formulario de correo se valida y se envia a authService.
 */
export default function Login() {
  useDocumentTitle('Inicia sesión')
  const [cargando, setCargando] = useState(false)
  const login = useAuthStore((s) => s.login)
  const notify = useUiStore((s) => s.notify)
  const navigate = useNavigate()
  const location = useLocation()
  const destino = (location.state as { from?: string } | null)?.from ?? rutas.inicio

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [tocado, setTocado] = useState({ correo: false, contrasena: false })
  const [enviando, setEnviando] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')

  const errores = validarLogin({ correo, contrasena })
  const ocupado = cargando || enviando

  const continuar = () => {
    setCargando(true)
    setTimeout(() => {
      login()
      navigate(destino, { replace: true })
    }, 1200)
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setTocado({ correo: true, contrasena: true })
    setErrorServidor('')
    if (hayErrores(errores)) return

    setEnviando(true)
    try {
      const usuario = await authService.login(correo, contrasena)
      login()
      notify('exito', `Hola de nuevo, ${usuario.nombre.split(' ')[0]}`, 'Iniciaste sesión correctamente.')
      navigate(destino, { replace: true })
    } catch (err) {
      setErrorServidor(mensajeDeError(err))
      setEnviando(false)
    }
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-16">
      <Halos />
      <div className="relative flex w-full max-w-[420px] flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3.5">
          <Logo size={56} />
          <p className="text-display font-bold">TalkWith</p>
        </div>
        <div className="flex w-full flex-col gap-7 rounded-2xl border border-line bg-panel p-8 shadow-low">
          <div className="flex flex-col gap-2">
            <h1 className="text-title font-bold">Bienvenido a TalkWith</h1>
            <p className="text-muted">Conversa, escucha y recupera lo importante.</p>
          </div>
          <Button variant="google" block loading={cargando} disabled={enviando} onClick={continuar}>
            {cargando ? 'Iniciando sesión' : 'Continuar con Google'}
          </Button>

          <div className="flex items-center gap-3 text-caption text-muted">
            <span className="h-px flex-1 bg-line" /> o con tu correo <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
            {errorServidor && (
              <p role="alert" className="flex items-center gap-2 rounded-[10px] border border-recording/40 bg-recording/10 px-3.5 py-2.5 text-small text-red-200">
                <AlertCircle className="size-4 shrink-0 text-recording" /> {errorServidor}
              </p>
            )}
            <Field
              label="Correo"
              type="email"
              placeholder="nombre@gmail.com"
              autoComplete="email"
              icon={<Mail className="size-[18px]" />}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              onBlur={() => setTocado({ ...tocado, correo: true })}
              error={tocado.correo ? errores.correo : undefined}
              disabled={ocupado}
            />
            <Field
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="current-password"
              icon={<Lock className="size-[18px]" />}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              onBlur={() => setTocado({ ...tocado, contrasena: true })}
              error={tocado.contrasena ? errores.contrasena : undefined}
              disabled={ocupado}
            />
            <Button type="submit" block loading={enviando} disabled={cargando}>
              {enviando ? 'Verificando…' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="text-center text-caption text-muted">
            Al continuar, aceptas los <a href="#" className="text-fg underline">Términos de uso</a> y el{' '}
            <a href="#" className="text-fg underline">Aviso de privacidad</a> de TalkWith.
          </p>
        </div>
        <p className="text-small text-muted">
          ¿Es tu primera vez? <Link to={rutas.registro} className="font-medium text-primary hover:underline">Crea tu cuenta</Link>
        </p>
      </div>
      <p className="absolute bottom-10 flex items-center gap-2.5 text-small text-muted">
        <AudioLines className="size-[18px] text-voice" /> Subtítulos en vivo y conversaciones que permanecen
      </p>
    </div>
  )
}

export function Halos() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-32 left-[12%] h-[620px] w-[900px] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute top-[58%] left-[39%] h-[560px] w-[820px] rounded-full bg-voice/[0.07] blur-[120px]" />
    </div>
  )
}
