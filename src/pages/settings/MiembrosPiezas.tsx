import { ChevronDown } from 'lucide-react'
import { useCallback } from 'react'
import Button from '../../components/ui/Button'
import { useClickOutside } from '../../hooks/useClickOutside'
import { cn } from '../../lib/cn'
import type { Rol, Usuario } from '../../types'
import { ETIQUETA_ROL, type RolAsignable } from './etiquetasRol'

const OPCIONES: RolAsignable[] = ['admin', 'miembro']

/** Selector de rol (solo lo ve la persona propietaria). El valor siempre sale de la caché de Firestore. */
export function SelectorRol({ valor, nombre, deshabilitado, onChange }: { valor: Rol; nombre: string; deshabilitado: boolean; onChange: (r: RolAsignable) => void }) {
  return (
    <span className="relative inline-flex">
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value as RolAsignable)}
        disabled={deshabilitado}
        aria-label={`Rol de ${nombre}`}
        className="h-[34px] cursor-pointer appearance-none rounded-lg border border-line bg-raised pr-8 pl-3 text-small font-medium text-fg hover:border-muted/50 focus:border-primary focus:outline-none disabled:cursor-wait disabled:opacity-60"
      >
        {OPCIONES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted" />
    </span>
  )
}

export function Estado({ usuario, enLlamada }: { usuario: Usuario; enLlamada: boolean }) {
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

interface PropsRetiro {
  usuario: Usuario
  abierto: boolean
  deshabilitado: boolean
  onAbrir: () => void
  onCerrar: () => void
  onConfirmar: () => void
}

/** Botón «Retirar» con su ventana de confirmación anclada (Figma 26). */
export function ConfirmarRetiro({ usuario, abierto, deshabilitado, onAbrir, onCerrar, onConfirmar }: PropsRetiro) {
  const cerrar = useCallback(() => onCerrar(), [onCerrar])
  const ref = useClickOutside<HTMLDivElement>(cerrar, abierto)
  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={abierto ? onCerrar : onAbrir}
        disabled={deshabilitado}
        aria-expanded={abierto}
        className={cn('h-8 rounded-lg px-2.5 text-small font-medium text-recording hover:bg-recording/10 disabled:opacity-60', abierto && 'bg-recording/15')}
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
            <Button variant="peligro" size="sm" onClick={onConfirmar} autoFocus>Confirmar retiro</Button>
          </div>
        </div>
      )}
    </div>
  )
}
