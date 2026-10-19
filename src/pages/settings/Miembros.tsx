import { ChevronDown, Search, ShieldCheck } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Can from '../../guards/Can'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { channelService, memberService, normalizar, userService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import type { Miembro, Usuario } from '../../types'
import Seccion from './Seccion'

const ROLES_VISIBLES = ['Coordinación', 'Estudiante'] as const
type RolVisible = (typeof ROLES_VISIBLES)[number]

/** Figma 26 · Miembros. Cambiar rol o retirar solo muestra la confirmación y un toast. */
export default function Miembros() {
  const { serverId = '' } = useParams()
  const miUid = useAuthStore((s) => s.usuario?.uid)
  const notify = useUiStore((s) => s.notify)
  const { data: miembros, loading } = useService(() => memberService.getByServer(serverId), [serverId])

  const [busqueda, setBusqueda] = useState('')
  const [rolesEditados, setRolesEditados] = useState<Record<string, RolVisible>>({})
  const [retirando, setRetirando] = useState<string | null>(null)

  const enLlamada = new Set(channelService.listByServer(serverId).flatMap((c) => channelService.inCall(c.canalId)))

  const q = normalizar(busqueda.trim())
  const filas = (miembros ?? [])
    .map((m) => ({ m, u: userService.find(m.uid) }))
    .filter((f): f is { m: Miembro; u: Usuario } => Boolean(f.u))
    // La persona propietaria va primero, como en el Figma.
    .sort((a, b) => Number(b.m.rol === 'propietario') - Number(a.m.rol === 'propietario'))
    .filter(({ u }) => !q || normalizar(u.nombre).includes(q) || normalizar(u.correo).includes(q))

  const rolDe = (m: Miembro): RolVisible => rolesEditados[m.uid] ?? (m.grupo === 'Coordinación' ? 'Coordinación' : 'Estudiante')

  const cambiarRol = (u: Usuario, rol: RolVisible) => {
    setRolesEditados((r) => ({ ...r, [u.uid]: rol }))
    notify('exito', 'Rol actualizado', `${u.nombre} ahora tiene el rol ${rol}.`)
  }

  const retirar = (u: Usuario) => {
    setRetirando(null)
    notify('exito', `${u.nombre} ya no es miembro`, 'Es solo una demostración: no se retiró a nadie.')
  }

  return (
    <Seccion
      titulo="Miembros"
      descripcion={`${miembros?.length ?? '…'} personas. Solo la persona propietaria puede cambiar roles o retirar miembros.`}
      accion={
        <label className="relative w-[250px] shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar por nombre o correo"
            className="h-10 w-full rounded-[10px] border border-line bg-raised/60 pr-3 pl-9 text-small placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </label>
      }
    >
      <table className="w-full text-left">
        <thead className="text-caption font-medium text-muted">
          <tr className="border-b border-line">
            <th className="py-2.5 pl-3 font-medium">Miembro</th>
            <th className="py-2.5 font-medium">Correo</th>
            <th className="py-2.5 font-medium">Rol</th>
            <th className="py-2.5 font-medium">Estado</th>
            <th className="w-24" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={5} className="py-6"><div className="h-6 animate-pulse rounded bg-raised" /></td>
            </tr>
          )}
          {filas.map(({ m, u }) => (
            <tr key={m.uid} className={cn('h-[58px] border-b border-line text-small transition-colors', retirando === u.uid && 'bg-recording/5')}>
              <td className="pl-3">
                <span className="flex items-center gap-2.5 text-body font-medium">
                  <Avatar uid={u.uid} size="sm" />
                  {u.nombre}
                  {u.uid === miUid && ' (tú)'}
                </span>
              </td>
              <td className="text-muted">{u.correo}</td>
              <td>
                {m.rol === 'propietario' ? (
                  <Badge tone="warning" icon={<ShieldCheck className="size-3.5" />}>Propietario</Badge>
                ) : (
                  <Can roles={['propietario']} fallback={<span className="text-muted">{rolDe(m)}</span>}>
                    <SelectorRol valor={rolDe(m)} nombre={u.nombre} onChange={(r) => cambiarRol(u, r)} />
                  </Can>
                )}
              </td>
              <td><Estado usuario={u} enLlamada={enLlamada.has(u.uid)} /></td>
              <td className="pr-3 text-right">
                {m.rol !== 'propietario' && (
                  <Can roles={['propietario']}>
                    <ConfirmarRetiro
                      usuario={u}
                      abierto={retirando === u.uid}
                      onAbrir={() => setRetirando(u.uid)}
                      onCerrar={() => setRetirando(null)}
                      onConfirmar={() => retirar(u)}
                    />
                  </Can>
                )}
              </td>
            </tr>
          ))}
          {!loading && filas.length === 0 && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-muted">Nadie coincide con «{busqueda}».</td>
            </tr>
          )}
        </tbody>
      </table>
    </Seccion>
  )
}

function SelectorRol({ valor, nombre, onChange }: { valor: RolVisible; nombre: string; onChange: (r: RolVisible) => void }) {
  return (
    <span className="relative inline-flex">
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value as RolVisible)}
        aria-label={`Rol de ${nombre}`}
        className="h-[34px] cursor-pointer appearance-none rounded-lg border border-line bg-raised pr-8 pl-3 text-small font-medium text-fg hover:border-muted/50 focus:border-primary focus:outline-none"
      >
        {ROLES_VISIBLES.map((r) => <option key={r}>{r}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
    </span>
  )
}

function Estado({ usuario, enLlamada }: { usuario: Usuario; enLlamada: boolean }) {
  const [texto, punto] = enLlamada
    ? ['En llamada', 'bg-voice']
    : usuario.estado === 'en-linea'
      ? ['En línea', 'bg-online']
      : usuario.estado === 'ausente'
        ? ['Ausente', 'bg-warning']
        : ['Desconectado', 'bg-muted']
  return (
    <span className="flex items-center gap-2 text-muted">
      <span className={cn('size-2 rounded-full', punto)} /> {texto}
    </span>
  )
}

/** Botón «Retirar» con su ventana de confirmación anclada (Figma 26). */
function ConfirmarRetiro({ usuario, abierto, onAbrir, onCerrar, onConfirmar }: { usuario: Usuario; abierto: boolean; onAbrir: () => void; onCerrar: () => void; onConfirmar: () => void }) {
  const cerrar = useCallback(() => onCerrar(), [onCerrar])
  const ref = useClickOutside<HTMLDivElement>(cerrar, abierto)
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={abierto ? onCerrar : onAbrir}
        aria-expanded={abierto}
        className={cn('h-8 rounded-lg px-2.5 text-small font-medium text-recording hover:bg-recording/10', abierto && 'bg-recording/15')}
      >
        Retirar
      </button>
      {abierto && (
        <div role="alertdialog" aria-labelledby={`retirar-${usuario.uid}`} className="animate-dialog-in absolute right-0 bottom-full z-20 mb-2 flex w-[300px] flex-col gap-3 rounded-xl border border-line bg-raised p-4 text-left shadow-high">
          <div className="flex flex-col gap-1">
            <p id={`retirar-${usuario.uid}`} className="text-subtitle font-semibold">¿Retirar a {usuario.nombre}?</p>
            <p className="text-small text-muted">Perderá acceso a los canales, mensajes y grabaciones de este servidor.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secundario" size="sm" onClick={onCerrar}>Cancelar</Button>
            <Button variant="peligro" size="sm" onClick={onConfirmar} autoFocus>Retirar</Button>
          </div>
        </div>
      )}
    </div>
  )
}
