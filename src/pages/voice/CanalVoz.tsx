import { Headphones } from 'lucide-react'
import Placeholder from '../../components/feedback/Placeholder'
import { rutas } from '../../lib/routes'
import type { Canal } from '../../types'

/**
 * Figma 12 · Voz con subtítulos, 13 · Sin subtítulos, 14 · Solicitud enviada,
 * 15 · Consentimiento y 16 · Grabación activa. Responsable: Diego.
 */
export default function CanalVoz({ canal }: { canal: Canal }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-5">
        <Headphones className="size-5 text-muted" />
        <h1 className="text-subtitle font-semibold">{canal.nombre}</h1>
      </header>
      <Placeholder
        num={['12', '13', '14', '15', '16']}
        titulo={canal.nombre}
        responsable="Diego"
        descripcion="Cuadrícula de participantes con subtítulos de ejemplo, panel de transcripción en vivo, controles de llamada, estado sin soporte de reconocimiento, modales de consentimiento y franja «Grabando»."
        enlaces={[
          { to: rutas.sesion(canal.servidorId, 's1'), label: 'Salir de la llamada → transcripción' },
          { to: rutas.canal(canal.servidorId, 'general'), label: '#general' },
        ]}
      />
    </div>
  )
}
