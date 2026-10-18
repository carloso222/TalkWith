import { cn } from '../../lib/cn'

/** Interruptor encendido/apagado (Figma: "Interruptor"). */
export default function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-[3px] transition-colors', checked ? 'bg-primary' : 'bg-raised')}
    >
      <span className={cn('size-[18px] rounded-full bg-white shadow-low transition-transform', checked && 'translate-x-4')} />
    </button>
  )
}
