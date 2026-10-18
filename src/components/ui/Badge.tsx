import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeTone = 'primary' | 'voice' | 'online' | 'recording' | 'warning' | 'muted'

const tonos: Record<BadgeTone, string> = {
  primary: 'bg-primary/15 text-primary',
  voice: 'bg-voice/15 text-voice',
  online: 'bg-online/15 text-online',
  recording: 'bg-recording/15 text-recording',
  warning: 'bg-warning/15 text-warning',
  muted: 'bg-raised text-muted',
}

/** Etiqueta tipo "píldora": En vivo, Grabada, Propietario, 3 en llamada… */
export default function Badge({ tone = 'muted', dot, icon, children, className }: { tone?: BadgeTone; dot?: boolean; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium whitespace-nowrap', tonos[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  )
}
