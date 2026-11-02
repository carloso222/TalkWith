import { Check } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Casilla de verificación con texto largo (aceptar términos, etc.). */
export default function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-small text-muted">
      <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-panel',
          checked ? 'border-primary bg-primary text-white' : 'border-line',
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span>{children}</span>
    </label>
  )
}
