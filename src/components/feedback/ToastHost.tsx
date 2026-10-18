import { AlertCircle, Check, Info, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useUiStore } from '../../store/uiStore'
import type { TipoToast } from '../../types'

const estilo: Record<TipoToast, { icono: typeof Check; clase: string }> = {
  exito: { icono: Check, clase: 'bg-online/15 text-online' },
  info: { icono: Info, clase: 'bg-primary/15 text-primary' },
  error: { icono: AlertCircle, clase: 'bg-recording/15 text-recording' },
}

/** Notificaciones (pantalla 09 del Figma). Se monta una vez en App. */
export default function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismiss)
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-6 bottom-6 z-[60] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-3">
      {toasts.map((t) => {
        const { icono: Icono, clase } = estilo[t.tipo]
        return (
          <div key={t.id} role="status" className="animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-raised px-4 py-3.5 shadow-high">
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', clase)}>
              <Icono className="size-4" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-small font-medium">{t.titulo}</p>
              {t.descripcion && <p className="text-caption text-muted">{t.descripcion}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="rounded p-0.5 text-muted hover:text-fg" aria-label="Cerrar notificación">
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
