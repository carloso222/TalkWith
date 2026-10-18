import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface Props {
  open: boolean
  onClose: () => void
  titulo: string
  descripcion?: string
  icono?: ReactNode
  children?: ReactNode
  acciones?: ReactNode
  ancho?: 'sm' | 'md' | 'lg'
  /** Color del recuadro del ícono. */
  tono?: 'primary' | 'peligro'
}

/** Modal base: fondo oscurecido, cierra con Escape o clic afuera. */
export default function Modal({ open, onClose, titulo, descripcion, icono, children, acciones, ancho = 'md', tono = 'primary' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={cn(
          'animate-dialog-in flex max-h-[calc(100vh-2rem)] w-full flex-col gap-5 overflow-y-auto rounded-2xl border border-line bg-panel p-8 shadow-high',
          ancho === 'sm' ? 'max-w-md' : ancho === 'md' ? 'max-w-[520px]' : 'max-w-2xl',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          {icono && <span className={cn('flex size-12 items-center justify-center rounded-xl', tono === 'peligro' ? 'bg-recording/15 text-recording' : 'bg-primary/15 text-primary')}>{icono}</span>}
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-muted hover:bg-raised hover:text-fg" aria-label="Cerrar">
            <X className="size-[18px]" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <h2 id="modal-titulo" className="text-heading font-semibold">{titulo}</h2>
          {descripcion && <p className="text-muted">{descripcion}</p>}
        </div>
        {children}
        {acciones && <div className="flex justify-end gap-3">{acciones}</div>}
      </div>
    </div>
  )
}
