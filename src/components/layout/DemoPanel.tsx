import { FlaskConical, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useClickOutside } from '../../hooks/useClickOutside'
import { rutas } from '../../lib/routes'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import type { Rol } from '../../types'

const roles: { valor: Rol | null; label: string }[] = [
  { valor: null, label: 'Rol real' },
  { valor: 'propietario', label: 'Propietario' },
  { valor: 'admin', label: 'Administrador' },
  { valor: 'miembro', label: 'Miembro' },
]

/**
 * Panel solo para la demo: cambia de rol para mostrar que RoleGuard bloquea
 * la configuración a un miembro, y dispara ejemplos de notificaciones.
 */
export default function DemoPanel() {
  const [abierto, setAbierto] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(() => setAbierto(false), abierto)
  const { rolDemo, setRolDemo, logout } = useAuthStore()
  const notify = useUiStore((s) => s.notify)
  const navigate = useNavigate()

  return (
    <div ref={ref} className="fixed bottom-[76px] left-3 z-40">
      {abierto && (
        <div className="animate-dialog-in absolute bottom-0 left-[60px] flex w-64 flex-col gap-3 rounded-xl border border-line bg-panel p-4 shadow-high">
          <div className="flex items-center justify-between">
            <p className="text-small font-semibold">Modo demo</p>
            <button onClick={() => setAbierto(false)} className="text-muted hover:text-fg" aria-label="Cerrar"><X className="size-4" /></button>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-caption text-muted">Simular rol (para probar las guardias)</p>
            <div className="grid grid-cols-2 gap-1.5">
              {roles.map((r) => (
                <button key={r.label} onClick={() => setRolDemo(r.valor)} className={`rounded-lg px-2 py-1.5 text-caption ${rolDemo === r.valor ? 'bg-primary text-white' : 'bg-raised text-fg hover:bg-raised/70'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-caption text-muted">Ejemplos de notificación</p>
            <div className="flex gap-1.5">
              <button onClick={() => notify('exito', 'Servidor creado correctamente', 'Club de Diseño UX ya está listo.')} className="flex-1 rounded-lg bg-online/15 py-1.5 text-caption text-online">Éxito</button>
              <button onClick={() => notify('info', 'Enlace de invitación copiado')} className="flex-1 rounded-lg bg-primary/15 py-1.5 text-caption text-primary">Info</button>
              <button onClick={() => notify('error', 'No se pudo subir la imagen', 'El archivo supera los 5 MB.')} className="flex-1 rounded-lg bg-recording/15 py-1.5 text-caption text-recording">Error</button>
            </div>
          </div>
          <button onClick={() => { logout(); navigate(rutas.login) }} className="rounded-lg border border-line py-1.5 text-caption hover:bg-raised">Cerrar sesión</button>
        </div>
      )}
      <button onClick={() => setAbierto((v) => !v)} title="Modo demo" className="relative flex size-12 items-center justify-center rounded-full border border-dashed border-line text-muted hover:border-muted hover:text-fg" aria-expanded={abierto} aria-label="Modo demo">
        <FlaskConical className="size-5" />
        {rolDemo && <span className="absolute top-0 right-0 size-3 rounded-full bg-warning ring-2 ring-base" />}
      </button>
    </div>
  )
}
