import { Globe, GripVertical, Hash, Headphones, Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import Button from '../../components/ui/Button'
import { Field, TextArea } from '../../components/ui/Field'
import Modal from '../../components/ui/Modal'
import Segmented from '../../components/ui/Segmented'
import { cn } from '../../lib/cn'
import { channelService } from '../../services'
import { useUiStore } from '../../store/uiStore'
import type { Canal, TipoCanal } from '../../types'
import Seccion from './Seccion'

const ROLES_DISPONIBLES = ['Coordinación', 'Estudiantes', 'Invitados']

/** Figma 25 · Canales y modal «Crear canal». Nada se guarda: solo se muestran confirmaciones y toasts. */
export default function Canales() {
  const { serverId = '' } = useParams()
  const notify = useUiStore((s) => s.notify)
  const confirm = useUiStore((s) => s.confirm)
  const canales = channelService.listByServer(serverId)
  // null = cerrado; { canal: undefined } = crear; { canal } = editar.
  const [modal, setModal] = useState<{ canal?: Canal } | null>(null)

  const eliminar = async (c: Canal) => {
    const nombre = c.tipo === 'texto' ? `#${c.nombre}` : c.nombre
    const ok = await confirm({
      titulo: `¿Eliminar ${nombre}?`,
      descripcion: c.tipo === 'texto' ? 'Se borrarán el canal y todo su historial de mensajes.' : 'Se borrará el canal. Las transcripciones de sus sesiones se conservan en el historial.',
      confirmar: 'Eliminar canal',
      peligro: true,
    })
    if (ok) notify('exito', 'Canal eliminado', 'Es solo una demostración: no se borró ningún registro.')
  }

  return (
    <Seccion
      titulo="Canales"
      descripcion="Arrastra para cambiar el orden en que aparecen en la barra lateral."
      accion={<Button icon={<Plus className="size-4" />} onClick={() => setModal({})}>Crear canal</Button>}
    >
      <table className="w-full text-left">
        <thead className="text-caption font-medium text-muted">
          <tr className="border-b border-line">
            <th className="w-9" aria-label="Orden" />
            <th className="py-2.5 font-medium">Canal</th>
            <th className="w-28 py-2.5 font-medium">Tipo</th>
            <th className="w-32 py-2.5 font-medium">Acceso</th>
            <th className="w-24" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {canales.map((c) => (
            <tr key={c.canalId} className="group h-14 border-b border-line text-body transition-colors hover:bg-raised/40">
              <td className="pl-2 text-muted/60"><GripVertical className="size-[18px] cursor-grab" aria-hidden /></td>
              <td>
                <span className="flex items-center gap-2.5 font-medium">
                  {c.tipo === 'texto' ? <Hash className="size-[18px] text-muted" /> : <Headphones className="size-[18px] text-muted" />}
                  {c.nombre}
                </span>
              </td>
              <td className="text-small text-muted">{c.tipo === 'texto' ? 'Texto' : 'Voz'}</td>
              <td className="text-small text-muted">
                <span className="flex items-center gap-1.5">
                  {c.privado ? <Lock className="size-4" /> : <Globe className="size-4" />}
                  {c.privado ? 'Privado' : 'General'}
                </span>
              </td>
              <td className="pr-2">
                <span className="flex justify-end gap-1">
                  <button onClick={() => setModal({ canal: c })} className="rounded-lg p-2 text-muted hover:bg-raised hover:text-fg" aria-label={`Editar ${c.nombre}`}>
                    <Pencil className="size-[18px]" />
                  </button>
                  <button onClick={() => eliminar(c)} className="rounded-lg p-2 text-recording/80 hover:bg-recording/10 hover:text-recording" aria-label={`Eliminar ${c.nombre}`}>
                    <Trash2 className="size-[18px]" />
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && <ModalCanal canal={modal.canal} onClose={() => setModal(null)} />}
    </Seccion>
  )
}

/** Modal «Crear canal» (o «Editar canal» si recibe uno). */
function ModalCanal({ canal, onClose }: { canal?: Canal; onClose: () => void }) {
  const notify = useUiStore((s) => s.notify)
  const editando = Boolean(canal)
  const [nombre, setNombre] = useState(canal?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoCanal>(canal?.tipo ?? 'texto')
  const [descripcion, setDescripcion] = useState(canal?.descripcion ?? '')
  const [acceso, setAcceso] = useState<'general' | 'privado'>(canal?.privado ? 'privado' : 'general')
  const [roles, setRoles] = useState<string[]>(['Coordinación', 'Estudiantes'])

  // Los canales de texto usan minúsculas y guiones, como en la barra lateral.
  const cambiarNombre = (v: string) => setNombre(tipo === 'texto' ? v.toLowerCase().replace(/\s+/g, '-') : v)
  const siguienteRol = ROLES_DISPONIBLES.find((r) => !roles.includes(r))
  const etiqueta = tipo === 'texto' ? `#${nombre.trim()}` : nombre.trim()

  const guardar = () => {
    if (!nombre.trim()) return
    if (editando) notify('exito', 'Canal actualizado', `Guardamos los cambios de ${etiqueta}.`)
    else notify('exito', 'Canal creado correctamente', `${etiqueta} ya está listo para tu equipo.`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      titulo={editando ? 'Editar canal' : 'Crear canal'}
      acciones={
        <>
          <Button variant="secundario" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={!nombre.trim()}>{editando ? 'Guardar cambios' : 'Crear canal'}</Button>
        </>
      }
    >
      <Field
        label="Nombre del canal"
        placeholder={tipo === 'texto' ? 'critica-final' : 'Sala de estudio'}
        icon={tipo === 'texto' ? <Hash className="size-[18px]" /> : <Headphones className="size-[18px]" />}
        value={nombre}
        onChange={(e) => cambiarNombre(e.target.value)}
        autoFocus
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-medium">Tipo de canal</legend>
        <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
          <OpcionTipo activa={tipo === 'texto'} onClick={() => setTipo('texto')} icono={<Hash className="size-[18px]" />} titulo="Texto" detalle="Mensajes y archivos" />
          <OpcionTipo activa={tipo === 'voz'} onClick={() => setTipo('voz')} icono={<Headphones className="size-[18px]" />} titulo="Voz" detalle="Con subtítulos" />
        </div>
      </fieldset>

      <TextArea label="Descripción" placeholder="Opcional. Explica para qué sirve el canal." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={1} />

      <div className="flex flex-col gap-2">
        <p className="text-small font-medium">Acceso</p>
        <Segmented
          label="Acceso"
          valor={acceso}
          onChange={setAcceso}
          opciones={[
            { valor: 'general', label: 'General', icono: <Globe className="size-4" /> },
            { valor: 'privado', label: 'Privado', icono: <Lock className="size-4" /> },
          ]}
        />
        <p className="text-caption text-muted">
          {acceso === 'privado' ? 'Solo los roles autorizados podrán ver y entrar al canal.' : 'Todas las personas del servidor podrán ver y entrar al canal.'}
        </p>
      </div>

      {acceso === 'privado' && (
        <div className="flex flex-col gap-2">
          <p className="text-small font-medium">Roles autorizados</p>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <span key={r} className="flex h-8 items-center gap-1.5 rounded-full bg-raised pr-2 pl-3 text-small font-medium">
                {r}
                <button onClick={() => setRoles((rs) => rs.filter((x) => x !== r))} className="rounded-full p-0.5 text-muted hover:text-fg" aria-label={`Quitar ${r}`}>
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
            <button
              disabled={!siguienteRol}
              onClick={() => siguienteRol && setRoles((rs) => [...rs, siguienteRol])}
              className="flex h-8 items-center gap-1 rounded-full border border-line px-3 text-small text-muted hover:text-fg disabled:opacity-50"
            >
              <Plus className="size-3.5" /> Agregar rol
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function OpcionTipo({ activa, onClick, icono, titulo, detalle }: { activa: boolean; onClick: () => void; icono: ReactNode; titulo: string; detalle: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition-colors', activa ? 'border-primary bg-primary/10' : 'border-line bg-raised/40 hover:bg-raised/70')}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-base">{icono}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-small font-medium">{titulo}</span>
        <span className="text-caption text-muted">{detalle}</span>
      </span>
      <span className={cn('flex size-[18px] shrink-0 items-center justify-center rounded-full border-2', activa ? 'border-primary' : 'border-muted')}>
        {activa && <span className="size-2 rounded-full bg-primary" />}
      </span>
    </button>
  )
}
