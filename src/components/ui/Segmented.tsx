import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface Segmento<T extends string> {
  valor: T
  label: string
  icono?: ReactNode
}

interface Props<T extends string> {
  valor: T
  opciones: Segmento<T>[]
  onChange: (v: T) => void
  /** Nombre para lectores de pantalla, p. ej. "Acceso". */
  label: string
  className?: string
}

/** Control segmentado del Figma: "Crear servidor | Unirme con invitación", "General | Privado". */
export default function Segmented<T extends string>({ valor, opciones, onChange, label, className }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex rounded-[10px] border border-line bg-base p-1', className)}>
      {opciones.map((o) => {
        const activo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(o.valor)}
            className={cn(
              'flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-small transition-colors',
              activo ? 'bg-raised font-medium text-fg shadow-low' : 'text-muted hover:text-fg',
            )}
          >
            {o.icono}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
