import { Hash, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import Badge, { type BadgeTone } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ServerIcon from '../../components/ui/ServerIcon'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { channelService, memberService, serverService } from '../../services'
import type { Rol, Servidor } from '../../types'

const etiquetaRol: Record<Rol, { label: string; tono: BadgeTone }> = {
  propietario: { label: 'Propietario', tono: 'primary' },
  admin: { label: 'Administrador', tono: 'voice' },
  miembro: { label: 'Miembro', tono: 'muted' },
}

type Filtro = 'todos' | Rol
const filtros: { valor: Filtro; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'propietario', label: 'Propietario' },
  { valor: 'admin', label: 'Administrador' },
  { valor: 'miembro', label: 'Miembro' },
]

/** Figma 06 · Tus servidores (listado). Responsable: Isaian. */
export default function Servidores() {
  useDocumentTitle('Tus servidores')
  const navigate = useNavigate()
  const { data: servidores, loading } = useService(() => serverService.getMine(), [])
  const [filtro, setFiltro] = useState<Filtro>('todos')

  const lista = servidores ?? []
  const contar = (f: Filtro) => (f === 'todos' ? lista.length : lista.filter((s) => memberService.roleOf(s.servidorId) === f).length)
  const visibles = filtro === 'todos' ? lista : lista.filter((s) => memberService.roleOf(s.servidorId) === filtro)
  const activos = lista.filter((s) => serverService.summary(s.servidorId).enLlamada > 0).length

  return (
    <div className="flex flex-col gap-6 px-12 pt-9 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-title font-bold tracking-tight">Tus servidores</h1>
          <p className="text-muted">
            {loading ? 'Cargando tus servidores…' : `Perteneces a ${lista.length} servidores · ${activos} tienen actividad ahora`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secundario" onClick={() => navigate(rutas.unirse)}>Unirme con invitación</Button>
          <Button onClick={() => navigate(rutas.crearServidor)}>Crear servidor</Button>
        </div>
      </header>

      {/* Pestañas por rol */}
      <div role="tablist" aria-label="Filtrar por rol" className="flex gap-7 border-b border-line">
        {filtros.map((f) => {
          const activo = filtro === f.valor
          return (
            <button
              key={f.valor}
              role="tab"
              aria-selected={activo}
              onClick={() => setFiltro(f.valor)}
              className={cn('-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-small font-medium transition-colors', activo ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg')}
            >
              {f.label}
              <span className={cn('rounded-[9px] px-[7px] py-px text-caption', activo ? 'bg-primary text-white' : 'bg-raised text-muted')}>{contar(f.valor)}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <div key={i} className="h-[206px] animate-pulse rounded-[14px] bg-panel" />)
          : visibles.map((s) => <TarjetaServidor key={s.servidorId} servidor={s} />)}
        <Link
          to={rutas.crearServidor}
          className="flex min-h-[206px] flex-col items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-line p-5 text-center transition-colors hover:border-muted/60 hover:bg-panel/40"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-raised">
            <Plus className="size-[22px]" />
          </span>
          <span className="text-subtitle font-semibold">Crea o únete a un servidor</span>
          <span className="text-small text-muted">Reúne a tu grupo en un espacio propio.</span>
        </Link>
      </div>
    </div>
  )
}

function TarjetaServidor({ servidor }: { servidor: Servidor }) {
  const navigate = useNavigate()
  const rol = memberService.roleOf(servidor.servidorId) ?? 'miembro'
  const { canales, enLlamada, actividad } = serverService.summary(servidor.servidorId)
  const primerCanal = channelService.listByServer(servidor.servidorId)[0]?.canalId ?? 'general'

  return (
    <button
      onClick={() => navigate(rutas.canal(servidor.servidorId, primerCanal))}
      className="flex flex-col gap-3.5 rounded-[14px] border border-line bg-panel p-5 text-left transition-colors hover:border-primary focus-visible:border-primary"
    >
      <div className="flex w-full items-start justify-between">
        <ServerIcon servidor={servidor} size={48} />
        <Badge tone={etiquetaRol[rol].tono}>{etiquetaRol[rol].label}</Badge>
      </div>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-subtitle font-semibold">{servidor.nombre}</h2>
        <p className="text-small text-muted">{servidor.descripcion}</p>
      </div>
      <div className="flex w-full items-center justify-between gap-2 border-t border-line pt-3.5 text-caption font-medium whitespace-nowrap text-muted">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5"><Users className="size-3.5" /> {servidor.totalMiembros} miembros</span>
          <span className="flex items-center gap-1.5"><Hash className="size-3.5" /> {canales} canales</span>
        </div>
        {enLlamada > 0 ? <Badge tone="voice">{enLlamada} en llamada</Badge> : <span>{actividad}</span>}
      </div>
    </button>
  )
}
