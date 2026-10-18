import { Hash } from 'lucide-react'
import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'
import type { Canal } from '../../types'

/** Figma 10 · Canal de texto y 11 · Reconectando. Responsable: Isaian. */
export default function CanalTexto({ canal }: { canal: Canal }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-5">
        <Hash className="size-5 text-muted" />
        <h1 className="text-subtitle font-semibold">{canal.nombre}</h1>
        {canal.descripcion && <p className="truncate border-l border-line pl-2.5 text-small text-muted">{canal.descripcion}</p>}
      </header>
      <Placeholder
        num={['10', '11']}
        titulo={`#${canal.nombre}`}
        responsable="Isaian"
        descripcion="Mensajes con adjuntos y menciones, acciones al pasar el cursor, indicador «escribiendo…», caja de mensaje, columna de miembros y aviso de reconexión (usa messageService y useAutoScroll)."
        enlaces={[{ to: rutas.canal(canal.servidorId, 'sala-principal'), label: 'Sala principal (voz)' }, { to: rutas.buscar(), label: 'Buscar' }]}
      />
    </div>
  )
}
