import type { ReactNode } from 'react'

interface Props {
  titulo: string
  descripcion: string
  /** Botón o buscador a la derecha del título. */
  accion?: ReactNode
  /** Barra fija al pie, p. ej. "Tienes cambios sin guardar". */
  pie?: ReactNode
  children: ReactNode
}

/** Contenido de una sección de configuración: título, descripción y cuerpo con scroll. */
export default function Seccion({ titulo, descripcion, accion, pie, children }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-10 pt-8 pb-8">
        <header className="mb-7 flex items-start justify-between gap-6">
          <div className="flex max-w-[640px] flex-col gap-1.5">
            <h1 className="text-title font-bold tracking-tight">{titulo}</h1>
            <p className="text-muted">{descripcion}</p>
          </div>
          {accion}
        </header>
        {children}
      </div>
      {pie}
    </div>
  )
}
