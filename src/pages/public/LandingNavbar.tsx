
import { Link } from 'react-router'
import Logo from '../../components/ui/Logo'
import Button from '../../components/ui/Button'
import { rutas } from '../../lib/routes'

export default function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-base/95 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <a href="#inicio" className="flex items-center gap-2">
          <Logo size={23} />
          <span className="text-sm font-semibold">TalkWith</span>
        </a>

        <div className="hidden items-center gap-6 md:flex">
          <a href="#funciones" className="text-xs text-muted transition hover:text-fg">
            Funciones
          </a>
          <a href="#como-funciona" className="text-xs text-muted transition hover:text-fg">
            Cómo funciona
          </a>
          <a href="#accesibilidad" className="text-xs text-muted transition hover:text-fg">
            Accesibilidad
          </a>
          <a href="#preguntas" className="text-xs text-muted transition hover:text-fg">
            Preguntas frecuentes
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Link to={rutas.login}>
            <Button variant="secundario" size="sm">Iniciar sesión</Button>
          </Link>
          <Link to={rutas.registro}>
            <Button size="sm">Crear cuenta</Button>
          </Link>
        </div>
      </nav>
    </header>
  )
}
