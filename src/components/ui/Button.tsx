import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import GoogleLogo from './GoogleLogo'

/** Componente "Botón" del Figma: Tipo = Primario | Secundario | Google | Peligro. */
export type ButtonVariant = 'primario' | 'secundario' | 'google' | 'peligro' | 'fantasma'

const variantes: Record<ButtonVariant, string> = {
  primario: 'bg-primary text-white hover:bg-primary/90 active:bg-primary-active',
  secundario: 'border border-line text-fg hover:bg-raised active:bg-raised/70',
  google: 'bg-white text-slate-900 hover:bg-slate-100 active:bg-slate-200',
  peligro: 'bg-recording text-white hover:bg-recording/90 active:bg-red-600',
  fantasma: 'text-muted hover:bg-raised hover:text-fg',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  icon?: ReactNode
  size?: 'md' | 'sm'
  block?: boolean
}

export default function Button({ variant = 'primario', loading, icon, size = 'md', block, className, children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-11 px-5 text-body' : 'h-9 px-3.5 text-small',
        variantes[variant],
        block && 'w-full',
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : variant === 'google' ? <GoogleLogo /> : icon}
      {children}
    </button>
  )
}
