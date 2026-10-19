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
  /**
   * chip: píldora pequeña (filtros de Búsqueda).
   * campo: botón de 40 px como los filtros del Historial ("Canal: Todos").
   */
  variante?: 'chip' | 'campo'
  /** Solo en "campo": texto de la opción vacía. Si no se pasa, no se puede dejar sin valor. */
  textoTodos?: string
}

/** Filtro con menú desplegable (usa la "directiva" useClickOutside). */
export default function Dropdown<T extends string>({ etiqueta, icono, valor, opciones, onChange, variante = 'chip', textoTodos }: Props<T>) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = useCallback(() => setAbierto(false), [])
  const ref = useClickOutside<HTMLDivElement>(cerrar, abierto)
  const elegida = opciones.find((o) => o.valor === valor)
  const campo = variante === 'campo'

  const vacia = campo ? textoTodos : 'Cualquiera'
  const lista: { valor: T | null; label: string }[] = vacia ? [{ valor: null, label: vacia }, ...opciones] : opciones

  let texto: string
  if (campo) {
    const actual = elegida?.label ?? textoTodos ?? ''
    texto = etiqueta ? `${etiqueta}: ${actual}` : actual
  } else {
    texto = elegida ? `${etiqueta}: ${elegida.label}` : etiqueta
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={cn(
          'inline-flex items-center gap-1.5 border transition-colors',
          campo
            ? 'h-10 rounded-[10px] border-line bg-panel px-3 text-small text-fg hover:border-muted/50 [&>svg:first-child]:text-muted'
            : cn('h-8 rounded-full px-3 text-small', elegida ? 'border-primary/50 bg-primary/10 text-fg' : 'border-line text-muted hover:text-fg'),
        )}
      >
        {icono}
        {texto}
        <ChevronDown className={cn('transition-transform', campo ? 'size-4 text-muted' : 'size-3.5', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <div role="listbox" className={cn('animate-dialog-in absolute left-0 z-30 min-w-52 rounded-xl border border-line bg-panel p-1.5 shadow-high', campo ? 'top-12' : 'top-10')}>
          {lista.map((o) => (
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
