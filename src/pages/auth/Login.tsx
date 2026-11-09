import { AlertCircle, AudioLines, CheckCircle2, Clock, Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import Button from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import Logo from '../../components/ui/Logo'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { hayErrores, REGLAS_ACCESO, validarAcceso } from '../../lib/validaciones'
import {
  crearCuentaConCorreo,
  iniciarSesionConCorreo,
  iniciarSesionConGoogle,
  mensajeErrorAuth,
  restablecerContrasena,
} from '../../services/authService'
import { useAuthStore } from '../../store/authStore'

type Modo = 'entrar' | 'crear'

/**
 * Figma 02 · Inicio de sesión y 03 · Inicio de sesión — cargando.
 * Se entra con Google o con correo y contraseña (Firebase Auth las guarda, nosotros no).
 * Al iniciar sesión, el listener de sesión actualiza el store y GuestRoute redirige;
 * una cuenta nueva pasa por Registro para completar el perfil.
 */
export default function Login() {
  const [modo, setModo] = useState<Modo>('entrar')
  useDocumentTitle(modo === 'entrar' ? 'Inicia sesión' : 'Crea tu cuenta')

  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [tocado, setTocado] = useState(false)
  const [cargando, setCargando] = useState<'google' | 'correo' | 'reset' | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  // lo deja lib/sesion.ts cuando la sesión expiró o llegó un 401
  const avisoSesion = useAuthStore((s) => s.avisoLogin)
  const setAvisoSesion = useAuthStore((s) => s.setAvisoLogin)

  const errores = validarAcceso({ correo, contrasena, confirmar }, modo)
  const ver = (e?: string) => (tocado ? e : undefined)

  const cambiarModo = (nuevo: Modo) => {
    setModo(nuevo)
    setTocado(false)
    setError('')
    setAviso('')
    setConfirmar('')
  }

  const conGoogle = async () => {
    setCargando('google')
    setError('')
    setAviso('')
    setAvisoSesion(null)
    try {
      await iniciarSesionConGoogle()
    } catch (e) {
      setError(mensajeErrorAuth(e) ?? '')
    } finally {
      setCargando(null)
    }
  }

  const conCorreo = async (e: FormEvent) => {
    e.preventDefault()
    setTocado(true)
    setAviso('')
    if (hayErrores(errores)) return
    setCargando('correo')
    setError('')
    setAvisoSesion(null)
    try {
      if (modo === 'entrar') await iniciarSesionConCorreo(correo, contrasena)
      else await crearCuentaConCorreo(correo, contrasena)
    } catch (err) {
      setError(mensajeErrorAuth(err) ?? '')
    } finally {
      setCargando(null)
    }
  }

  const olvide = async () => {
    setError('')
    setAviso('')
    if (errores.correo) {
      setError('Escribe tu correo arriba y vuelve a pulsar «¿Olvidaste tu contraseña?».')
      return
    }
    setCargando('reset')
    try {
      await restablecerContrasena(correo)
      setAviso('Si hay una cuenta con ese correo, te enviamos un enlace para restablecer la contraseña.')
    } catch (err) {
      setError(mensajeErrorAuth(err) ?? '')
    } finally {
      setCargando(null)
    }
  }

  const ocupado = cargando !== null

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-4 py-16">
      <Halos />
      <div className="relative flex w-full max-w-[420px] flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3.5">
          <Logo size={56} />
          <p className="text-display font-bold">TalkWith</p>
        </div>
        <div className="flex w-full flex-col gap-6 rounded-2xl border border-line bg-panel p-8 shadow-low">
          <div className="flex flex-col gap-2">
            <h1 className="text-title font-bold">{modo === 'entrar' ? 'Bienvenido a TalkWith' : 'Crea tu cuenta'}</h1>
            <p className="text-muted">Conversa, escucha y recupera lo importante.</p>
          </div>
          {avisoSesion && (
            <p role="alert" className="flex items-center gap-2 rounded-[10px] border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-small">
              <Clock className="size-4 shrink-0 text-warning" /> {avisoSesion}
            </p>
          )}
          {error && (
            <p role="alert" className="flex items-center gap-2 rounded-[10px] border border-recording/40 bg-recording/10 px-3.5 py-2.5 text-small text-red-200">
              <AlertCircle className="size-4 shrink-0 text-recording" /> {error}
            </p>
          )}
          {aviso && (
            <p role="status" className="flex items-center gap-2 rounded-[10px] border border-voice/40 bg-voice/10 px-3.5 py-2.5 text-small">
              <CheckCircle2 className="size-4 shrink-0 text-voice" /> {aviso}
            </p>
          )}

          <Button variant="google" block loading={cargando === 'google'} disabled={ocupado} onClick={conGoogle}>
            {cargando === 'google' ? 'Iniciando sesión' : 'Continuar con Google'}
          </Button>

          <div className="flex items-center gap-3 text-caption text-muted" aria-hidden>
            <span className="h-px flex-1 bg-line" /> o con tu correo <span className="h-px flex-1 bg-line" />
          </div>

          <form noValidate onSubmit={conCorreo} className="flex flex-col gap-4">
            <Field
              label="Correo"
              type="email"
              icon={<Mail className="size-4" />}
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              error={ver(errores.correo)}
              disabled={ocupado}
            />
            <Field
              label="Contraseña"
              type="password"
              icon={<Lock className="size-4" />}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              maxLength={REGLAS_ACCESO.contrasenaMax}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              error={ver(errores.contrasena)}
              help={modo === 'crear' ? `Mínimo ${REGLAS_ACCESO.contrasenaMin} caracteres, con letras y números.` : undefined}
              disabled={ocupado}
            />
            {modo === 'crear' && (
              <Field
                label="Confirma tu contraseña"
                type="password"
                icon={<Lock className="size-4" />}
                autoComplete="new-password"
                maxLength={REGLAS_ACCESO.contrasenaMax}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                error={ver(errores.confirmar)}
                disabled={ocupado}
              />
            )}
            {modo === 'entrar' && (
              <button
                type="button"
                onClick={olvide}
                disabled={ocupado}
                className="self-end text-small font-medium text-primary hover:underline disabled:opacity-60"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            <Button type="submit" block loading={cargando === 'correo'} disabled={ocupado}>
              {modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-center text-small text-muted">
            {modo === 'entrar' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              type="button"
              onClick={() => cambiarModo(modo === 'entrar' ? 'crear' : 'entrar')}
              className="font-medium text-primary hover:underline"
            >
              {modo === 'entrar' ? 'Crea una' : 'Inicia sesión'}
            </button>
          </p>

          <p className="text-center text-caption text-muted">
            Al continuar, aceptas los <a href="#" className="text-fg underline">Términos de uso</a> y el{' '}
            <a href="#" className="text-fg underline">Aviso de privacidad</a> de TalkWith.
          </p>
        </div>
      </div>
      <p className="absolute bottom-10 flex items-center gap-2.5 text-small text-muted">
        <AudioLines className="size-[18px] text-voice" /> Subtítulos en vivo y conversaciones que permanecen
      </p>
    </div>
  )
}

/** Resplandores de fondo de las pantallas de acceso (también los usa la 404). */
export function Halos() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -top-32 left-[12%] h-[620px] w-[900px] rounded-full bg-primary/15 blur-[120px]" />
      <div className="absolute top-[58%] left-[39%] h-[560px] w-[820px] rounded-full bg-voice/[0.07] blur-[120px]" />
    </div>
  )
}
