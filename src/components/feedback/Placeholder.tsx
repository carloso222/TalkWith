import { ArrowRight, LayoutTemplate, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

export type Responsable = 'Carlos' | 'Diego' | 'Isaian'

interface Props {
  /** Número de la pantalla en el Figma (01–29). */
  num: string | string[]
  titulo: string
  responsable: Responsable
  descripcion?: string
  enlaces?: { to: string; label: string }[]
  children?: ReactNode
}

/**
 * Página de relleno: marca la ruta como "por construir" y enlaza a las rutas
 * vecinas para que la navegación ya funcione. Quien tenga asignada la pantalla
 * reemplaza este componente por la vista real del Figma.
 */
export default function Placeholder({ num, titulo, responsable, descripcion, enlaces = [], children }: Props) {
  useDocumentTitle(titulo)
  const nums = Array.isArray(num) ? num : [num]
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-center gap-2 text-caption text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1">
          <LayoutTemplate className="size-3.5" /> Figma {nums.join(' · ')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-primary">
          <User className="size-3.5" /> {responsable}
        </span>
        <span className="rounded-full bg-warning/15 px-2.5 py-1 text-warning">Por construir</span>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-title font-bold">{titulo}</h1>
        {descripcion && <p className="text-muted">{descripcion}</p>}
      </div>
      {children}
      {enlaces.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-caption font-medium tracking-wide text-muted uppercase">Navegar a</p>
          <div className="flex flex-wrap gap-2">
            {enlaces.map((e) => (
              <Link key={e.to + e.label} to={e.to} className="inline-flex items-center gap-1.5 rounded-[10px] border border-line px-3.5 py-2 text-small hover:bg-raised">
                {e.label} <ArrowRight className="size-3.5 text-muted" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
