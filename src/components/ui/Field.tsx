import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface Base {
  label: string
  help?: string
  error?: string
  icon?: ReactNode
}

const control =
  'w-full rounded-[10px] border border-line bg-raised px-3.5 text-body text-fg placeholder:text-muted transition-colors ' +
  'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-base disabled:text-muted'

/** Campo de texto con etiqueta, ayuda y error (estilo "Campo" del Figma). */
export function Field({ label, help, error, icon, className, ...rest }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-small font-medium">{label}</label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">{icon}</span>}
        <input id={id} {...rest} aria-invalid={Boolean(error)} className={cn(control, 'h-11', icon && 'pl-10', error && 'border-recording')} />
      </div>
      {error ? <p className="text-caption text-recording">{error}</p> : help && <p className="text-caption text-muted">{help}</p>}
    </div>
  )
}

export function TextArea({ label, help, className, ...rest }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-small font-medium">{label}</label>
      <textarea id={id} rows={3} {...rest} className={cn(control, 'resize-none py-3')} />
      {help && <p className="text-caption text-muted">{help}</p>}
    </div>
  )
}
