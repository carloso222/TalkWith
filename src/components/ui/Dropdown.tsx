import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { useClickOutside } from '../../hooks/useClickOutside'
import { cn } from '../../lib/cn'

export interface Opcion<T extends string> {
  valor: T
  label: string
}

interface Props<T extends string> {
  /** Texto cuando no hay valor elegido, p. ej. "Participante". */
  etiqueta: string
  icono?: ReactNode
  valor: T | null
  opciones: Opcion<T>[]
  onChange: (v: T | null) => void
}

/** Chip de filtro con menú desplegable (usa la "directiva" useClickOutside). */
export default function Dropdown<T extends string>({ etiqueta, icono, valor, opciones, onChange }: Props<T>) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = useCallback(() => setAbierto(false), [])
  const ref = useClickOutside<HTMLDivElement>(cerrar, abierto)
  const elegida = opciones.find((o) => o.valor === valor)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={cn(
          'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-small transition-colors',
          elegida ? 'border-primary/50 bg-primary/10 text-fg' : 'border-line text-muted hover:text-fg',
        )}
      >
        {icono}
        {elegida ? `${etiqueta}: ${elegida.label}` : etiqueta}
        <ChevronDown className={cn('size-3.5 transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <div role="listbox" className="animate-dialog-in absolute top-10 left-0 z-30 min-w-52 rounded-xl border border-line bg-panel p-1.5 shadow-high">
          {[{ valor: null, label: 'Cualquiera' } as { valor: T | null; label: string }, ...opciones].map((o) => (
            <button
              key={o.label}
              role="option"
              aria-selected={o.valor === valor}
              onClick={() => {
                onChange(o.valor)
                cerrar()
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-small hover:bg-raised"
            >
              {o.label}
              {o.valor === valor && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
