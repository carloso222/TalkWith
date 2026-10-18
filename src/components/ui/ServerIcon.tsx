import { cn } from '../../lib/cn'
import type { Servidor } from '../../types'

export default function ServerIcon({ servidor, size = 48, className }: { servidor: Servidor; size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center font-semibold text-white', className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.29), backgroundColor: servidor.color, fontSize: size * 0.3 }}
    >
      {servidor.iniciales}
    </span>
  )
}
