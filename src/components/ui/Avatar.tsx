import { cn } from '../../lib/cn'
import { userService } from '../../services'
import type { EstadoPresencia } from '../../types'

const tamanos = { xs: 'size-6 text-[10px]', sm: 'size-8 text-caption', md: 'size-10 text-small', lg: 'size-16 text-heading', xl: 'size-24 text-title' }
const punto = { 'en-linea': 'bg-online', ausente: 'bg-warning', desconectado: 'bg-muted' }

interface Props {
  uid: string
  size?: keyof typeof tamanos
  /** Muestra el punto de presencia en la esquina. */
  presencia?: boolean
  /** Anillo cian cuando la persona está hablando. */
  hablando?: boolean
  className?: string
}

/** Avatar con iniciales y color del Figma (ninguna imagen remota). */
export default function Avatar({ uid, size = 'md', presencia, hablando, className }: Props) {
  const u = userService.find(uid)
  if (!u) return null
  return (
    <span className={cn('relative inline-flex shrink-0', className)} title={u.nombre}>
      <span
        className={cn('inline-flex items-center justify-center rounded-full font-semibold text-base', tamanos[size], hablando && 'ring-2 ring-voice ring-offset-2 ring-offset-panel')}
        style={{ backgroundColor: u.color }}
      >
        {u.iniciales}
      </span>
      {presencia && (
        <span className={cn('absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-[3px] ring-panel', size === 'xl' && 'right-1 bottom-1 size-5', punto[u.estado as EstadoPresencia])} />
      )}
    </span>
  )
}
