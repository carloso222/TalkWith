import { AlertCircle, AudioLines } from 'lucide-react'
import { useState } from 'react'
import Button from '../../components/ui/Button'
import Logo from '../../components/ui/Logo'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { iniciarSesionConGoogle, mensajeErrorAuth } from '../../services/authService'

/**
 * Figma 02 · Inicio de sesión y 03 · Inicio de sesión — cargando.
 * Solo se entra con Google (sin contraseñas propias). Al volver el popup, el listener
 * de sesión actualiza el store y GuestRoute redirige.
 */
export default function Login() {
  useDocumentTitle('Inicia sesión')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const continuar = async () => {
    setCargando(true)
    setError('')
    try {
      await iniciarSesionConGoogle()
    } catch (e) {
      setError(mensajeErrorAuth(e) ?? '')
    } finally {
      setCargando(false)
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
          {error && (
            <p role="alert" className="flex items-center gap-2 rounded-[10px] border border-recording/40 bg-recording/10 px-3.5 py-2.5 text-small text-red-200">
              <AlertCircle className="size-4 shrink-0 text-recording" /> {error}
            </p>
          )}
          <Button variant="google" block loading={cargando} onClick={continuar}>
            {cargando ? 'Iniciando sesión' : 'Continuar con Google'}
          </Button>

          <p className="text-center text-caption text-muted">
            Al continuar, aceptas los <a href="#" className="text-fg underline">Términos de uso</a> y el{' '}
            <a href="#" className="text-fg underline">Aviso de privacidad</a> de TalkWith.
          </p>
        </div>
        <p className="text-small text-muted">Tu cuenta se crea al entrar con Google</p>
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
