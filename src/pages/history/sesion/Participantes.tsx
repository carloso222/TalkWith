import { ShieldCheck } from 'lucide-react'
import Avatar from '../../../components/ui/Avatar'
import { sessionService, userService } from '../../../services'
import type { SesionVoz } from '../../../types'

/** Columna derecha del detalle: quién participó y cuánto habló. */
export default function Participantes({ sesion }: { sesion: SesionVoz }) {
  const tiempos = sessionService.speakingTime(sesion.sesionId)
  return (
    <aside className="hidden w-72 shrink-0 flex-col gap-4 xl:flex">
      <section className="flex flex-col gap-1 rounded-2xl border border-line bg-panel p-4">
        <h2 className="px-1 pb-2 text-small font-semibold">Participantes</h2>
        {sesion.participantes.map((uid) => {
          const u = userService.find(uid)
          return (
            <div key={uid} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
              <Avatar uid={uid} size="sm" />
              <span className="flex-1 truncate text-small">{u?.nombre}</span>
              <span className="text-caption text-muted">{tiempos[uid] ?? '—'}</span>
            </div>
          )
        })}
      </section>
      <p className="flex gap-2.5 rounded-xl bg-raised/60 p-3.5 text-caption text-muted">
        <ShieldCheck className="size-4 shrink-0 text-online" />
        {sesion.grabacion === 'sin-grabacion'
          ? 'Esta sesión solo se transcribió. Nadie solicitó grabarla.'
          : `Grabada con el consentimiento de los ${sesion.participantes.length} participantes.`}
      </p>
    </aside>
  )
}
