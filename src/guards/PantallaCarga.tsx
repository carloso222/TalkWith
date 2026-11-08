import Logo from '../components/ui/Logo'

/** Pantalla mínima mientras Firebase restaura la sesión. */
export default function PantallaCarga() {
  return (
    <div role="status" className="flex min-h-full flex-col items-center justify-center gap-3 bg-base">
      <Logo size={48} />
      <p className="text-small text-muted">Cargando…</p>
    </div>
  )
}
