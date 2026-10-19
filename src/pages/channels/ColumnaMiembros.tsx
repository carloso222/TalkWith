import { Headphones } from 'lucide-react'
import Avatar from '../../components/ui/Avatar'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { channelService, memberService, userService } from '../../services'
import type { Miembro, Rol, Usuario } from '../../types'

const orden: Record<Rol, number> = { propietario: 1, admin: 0, miembro: 2 }

interface Persona {
  miembro: Miembro
  usuario: Usuario
  /** Nombre del canal de voz donde está, si está en llamada. */
  enCanal?: string
}

/** Columna de miembros de 248 px del canal de texto (Figma 10). */
export default function ColumnaMiembros({ servidorId }: { servidorId: string }) {
  const { data: miembros } = useService(() => memberService.getByServer(servidorId), [servidorId])

  // Quién está en cada canal de voz del servidor.
  const llamada = new Map<string, string>()
  for (const c of channelService.listByServer(servidorId).filter((c) => c.tipo === 'voz')) {
    for (const uid of channelService.inCall(c.canalId)) llamada.set(uid, c.nombre)
  }

  const personas: Persona[] = (miembros ?? [])
    .map((m) => ({ miembro: m, usuario: userService.find(m.uid)!, enCanal: llamada.get(m.uid) }))
    .filter((p) => p.usuario)

  const enLinea = personas.filter((p) => p.usuario.estado !== 'desconectado')
  const desconectados = personas.filter((p) => p.usuario.estado === 'desconectado')

  // Grupos de personas en línea ("Coordinación", "Estudiantes en línea"), ordenados por rol.
  const grupos = new Map<string, Persona[]>()
  for (const p of [...enLinea].sort((a, b) => orden[a.miembro.rol] - orden[b.miembro.rol])) {
    const g = p.miembro.grupo ?? 'En línea'
    grupos.set(g, [...(grupos.get(g) ?? []), p])
  }
  const tituloGrupo = (g: string) => (desconectados.some((p) => p.miembro.grupo === g) ? `${g} en línea` : g)

  return (
    <aside aria-label="Miembros" className="hidden w-[248px] shrink-0 overflow-y-auto border-l border-line bg-panel px-3 py-5 lg:block">
      {[...grupos].map(([g, lista]) => (
        <Grupo key={g} titulo={tituloGrupo(g)} personas={[...lista].sort((a, b) => Number(Boolean(b.enCanal)) - Number(Boolean(a.enCanal)))} />
      ))}
      {desconectados.length > 0 && <Grupo titulo="Desconectados" personas={desconectados} apagado />}
    </aside>
  )
}

function Grupo({ titulo, personas, apagado }: { titulo: string; personas: Persona[]; apagado?: boolean }) {
  return (
    <section className="mb-5">
      <h3 className="mb-1.5 flex justify-between px-2 text-caption font-medium text-muted">
        {titulo} <span>{personas.length}</span>
      </h3>
      {personas.map(({ usuario: u, enCanal }) => (
        <div key={u.uid} className={cn('flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-raised/60', apagado && 'opacity-50')}>
          <Avatar uid={u.uid} size="sm" presencia={!enCanal} hablando={Boolean(enCanal)} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body font-medium">{u.nombre}</span>
            {enCanal ? (
              <span className="flex items-center gap-1 text-caption text-voice"><Headphones className="size-3" /> En {enCanal}</span>
            ) : (
              u.estadoTexto && <span className="truncate text-caption text-muted">{u.estadoTexto}</span>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
