import { Search, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { useCurrentRole } from '../../hooks/useCurrentRole'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { puedeCambiarRol, puedeRetirar } from '../../lib/permisos'
import { rutas } from '../../lib/routes'
import { channelService, manejarError, memberService, normalizar, userService } from '../../services'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import type { Miembro, Usuario } from '../../types'
import { ETIQUETA_ROL, type RolAsignable } from './etiquetasRol'
import { ConfirmarRetiro, Estado, SelectorRol } from './MiembrosPiezas'
import Seccion from './Seccion'

/**
 * Figma 26 · Miembros (TW 07). La persona propietaria asigna administradores; propietario y
 * administradores retiran según la matriz. Los botones solo reflejan lo que permiten las reglas
 * de Firestore (`lib/permisos.ts`); las reglas son las que de verdad lo imponen.
 */
export default function Miembros() {
  const { serverId = '' } = useParams()
  const navigate = useNavigate()
  const miUid = useAuthStore((s) => s.usuario?.uid) ?? ''
  const miRol = useCurrentRole()
  const notify = useUiStore((s) => s.notify)
  const confirm = useUiStore((s) => s.confirm)
  const { data: miembros, loading } = useService(() => memberService.getByServer(serverId), [serverId])

  const [busqueda, setBusqueda] = useState('')
  const [retirando, setRetirando] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const enLlamada = new Set(channelService.listByServer(serverId).flatMap((c) => channelService.inCall(c.canalId)))

  const q = normalizar(busqueda.trim())
  const filas = (miembros ?? [])
    .map((m) => ({ m, u: userService.find(m.uid) }))
    .filter((f): f is { m: Miembro; u: Usuario } => Boolean(f.u))
    // La persona propietaria va primero, como en el Figma.
    .sort((a, b) => Number(b.m.rol === 'propietario') - Number(a.m.rol === 'propietario'))
    .filter(({ u }) => !q || normalizar(u.nombre).includes(q) || normalizar(u.correo).includes(q))

  const ejecutar = async (uid: string, accion: () => Promise<void>, error: string) => {
    setOcupado(uid)
    try {
      await accion()
    } catch (e) {
      manejarError(e, error)
    } finally {
      setOcupado(null)
    }
  }

  const cambiarRol = (u: Usuario, rol: RolAsignable) =>
    ejecutar(u.uid, async () => {
      await memberService.setRole(serverId, u.uid, rol)
      notify('exito', 'Rol actualizado', `${u.nombre} ahora es ${ETIQUETA_ROL[rol].toLowerCase()}.`)
    }, 'No se pudo cambiar el rol')

  const retirar = (u: Usuario) => {
    setRetirando(null)
    return ejecutar(u.uid, async () => {
      await memberService.remove(serverId, u.uid)
      notify('exito', `${u.nombre} ya no es miembro`)
    }, 'No se pudo retirar a la persona')
  }

  const salir = async () => {
    const ok = await confirm({
      titulo: '¿Salir del servidor?',
      descripcion: 'Perderás el acceso a sus canales, mensajes y grabaciones. Podrás volver con una invitación.',
      confirmar: 'Salir del servidor',
      peligro: true,
    })
    if (!ok) return
    await ejecutar(miUid, async () => {
      await memberService.leave(serverId)
      navigate(rutas.inicio)
      notify('exito', 'Saliste del servidor')
    }, 'No se pudo salir del servidor')
  }

  return (
    <Seccion
      titulo="Miembros"
      descripcion={`${miembros?.length ?? '…'} personas. La persona propietaria asigna administradores; propietario y administradores pueden retirar miembros.`}
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
          {filas.map(({ m, u }) => {
            const objetivo = { uid: m.uid, rol: m.rol }
            return (
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
                  ) : puedeCambiarRol(miRol, miUid, objetivo) ? (
                    <SelectorRol valor={m.rol} nombre={u.nombre} deshabilitado={ocupado === u.uid} onChange={(r) => cambiarRol(u, r)} />
                  ) : (
                    <span className="text-muted">{ETIQUETA_ROL[m.rol]}</span>
                  )}
                </td>
                <td><Estado usuario={u} enLlamada={enLlamada.has(u.uid)} /></td>
                <td className="pr-3 text-right">
                  {puedeRetirar(miRol, miUid, objetivo) && (
                    <ConfirmarRetiro
                      usuario={u}
                      abierto={retirando === u.uid}
                      deshabilitado={ocupado === u.uid}
                      onAbrir={() => setRetirando(u.uid)}
                      onCerrar={() => setRetirando(null)}
                      onConfirmar={() => retirar(u)}
                    />
                  )}
                  {u.uid === miUid && miRol === 'admin' && (
                    <button
                      onClick={salir}
                      disabled={ocupado === u.uid}
                      className="h-8 rounded-lg px-2.5 text-small font-medium text-recording hover:bg-recording/10 disabled:opacity-60"
                    >
                      Salir
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
          {!loading && filas.length === 0 && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-muted">
                {busqueda ? `Nadie coincide con «${busqueda}».` : 'Todavía no hay miembros que mostrar.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Seccion>
  )
}
