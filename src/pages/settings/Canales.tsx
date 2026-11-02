import { AlertTriangle, Globe, GripVertical, Hash, Headphones, Loader2, Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import Button from '../../components/ui/Button'
import { Field, TextArea } from '../../components/ui/Field'
import Modal from '../../components/ui/Modal'
import Segmented from '../../components/ui/Segmented'
import { useService } from '../../hooks/useService'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { hayErrores, REGLAS, validarCanal } from '../../lib/validaciones'
import { ApiError, channelService, manejarError } from '../../services'
import { useUiStore } from '../../store/uiStore'
import type { Canal, TipoCanal } from '../../types'
import Seccion from './Seccion'

const ROLES_DISPONIBLES = ['Coordinación', 'Estudiantes', 'Invitados']

// nombre como se ve en la barra lateral
const etiquetaCanal = (c: Pick<Canal, 'nombre' | 'tipo'>) => (c.tipo === 'texto' ? `#${c.nombre}` : c.nombre)

/** Figma 25 · Canales: crud completo de canales (listar, detalle, crear, editar y eliminar). */
export default function Canales() {
  const { serverId = '' } = useParams()
  const notify = useUiStore((s) => s.notify)
  const confirm = useUiStore((s) => s.confirm)
  const { data: canales, loading, error, recargar } = useService(() => channelService.getByServer(serverId), [serverId])

  // null = cerrado, {} = crear, { canal } = editar
  const [modal, setModal] = useState<{ canal?: Canal } | null>(null)
  const [detalleId, setDetalleId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const eliminar = async (c: Canal) => {
    const ok = await confirm({
      titulo: `¿Eliminar ${etiquetaCanal(c)}?`,
      descripcion: c.tipo === 'texto' ? 'Se borrarán el canal y todo su historial de mensajes.' : 'Se borrará el canal. Las transcripciones de sus sesiones se conservan en el historial.',
      confirmar: 'Eliminar canal',
      peligro: true,
    })
    if (!ok) return

    setEliminandoId(c.canalId)
    try {
      await channelService.remove(c.canalId)
      notify('exito', 'Canal eliminado', `${etiquetaCanal(c)} ya no aparece en el servidor.`)
      setDetalleId(null)
      recargar()
    } catch (e) {
      manejarError(e, 'No se pudo eliminar el canal')
    } finally {
      setEliminandoId(null)
    }
  }

  const editar = (c: Canal) => {
    setDetalleId(null)
    setModal({ canal: c })
  }

  const alGuardar = () => {
    setModal(null)
    recargar()
  }

  return (
    <Seccion
      titulo="Canales"
      descripcion="Crea, edita o elimina los canales de texto y de voz de tu servidor."
      accion={<Button icon={<Plus className="size-4" />} onClick={() => setModal({})}>Crear canal</Button>}
    >
      {loading && !canales && (
        <div className="flex items-center justify-center gap-2.5 py-16 text-muted">
          <Loader2 className="size-5 animate-spin" /> Cargando canales…
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-recording/40 bg-recording/5 px-6 py-12 text-center">
          <AlertTriangle className="size-7 text-recording" />
          <p className="font-medium">No pudimos cargar los canales</p>
          <p className="text-small text-muted">{error}</p>
          <Button variant="secundario" size="sm" onClick={recargar}>Reintentar</Button>
        </div>
      )}

      {!error && canales && canales.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <Hash className="size-7 text-muted" />
          <p className="font-medium">Este servidor todavía no tiene canales</p>
          <p className="text-small text-muted">Crea el primero para que tu equipo pueda conversar.</p>
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setModal({})}>Crear canal</Button>
        </div>
      )}

      {!error && canales && canales.length > 0 && (
        <table className={cn('w-full text-left transition-opacity', loading && 'opacity-60')}>
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
                  <button onClick={() => setDetalleId(c.canalId)} className="flex items-center gap-2.5 font-medium hover:underline" aria-label={`Ver detalle de ${c.nombre}`}>
                    {c.tipo === 'texto' ? <Hash className="size-[18px] text-muted" /> : <Headphones className="size-[18px] text-muted" />}
                    {c.nombre}
                  </button>
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
                    <button onClick={() => editar(c)} className="rounded-lg p-2 text-muted hover:bg-raised hover:text-fg" aria-label={`Editar ${c.nombre}`}>
                      <Pencil className="size-[18px]" />
                    </button>
                    <button
                      onClick={() => eliminar(c)}
                      disabled={eliminandoId === c.canalId}
                      className="rounded-lg p-2 text-recording/80 hover:bg-recording/10 hover:text-recording disabled:opacity-50"
                      aria-label={`Eliminar ${c.nombre}`}
                    >
                      {eliminandoId === c.canalId ? <Loader2 className="size-[18px] animate-spin" /> : <Trash2 className="size-[18px]" />}
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detalleId && (
        <ModalDetalle
          canalId={detalleId}
          serverId={serverId}
          eliminando={eliminandoId === detalleId}
          onClose={() => setDetalleId(null)}
          onEditar={editar}
          onEliminar={eliminar}
        />
      )}
      {modal && <ModalCanal serverId={serverId} canal={modal.canal} onClose={() => setModal(null)} onGuardado={alGuardar} />}
    </Seccion>
  )
}

/** Detalle de un canal, se pide al servicio por id. */
function ModalDetalle({ canalId, serverId, eliminando, onClose, onEditar, onEliminar }: {
  canalId: string
  serverId: string
  eliminando: boolean
  onClose: () => void
  onEditar: (c: Canal) => void
  onEliminar: (c: Canal) => void
}) {
  const { data: canal, loading, error, recargar } = useService(() => channelService.getById(canalId), [canalId])

  return (
    <Modal
      open
      onClose={onClose}
      titulo="Detalle del canal"
      acciones={
        canal && (
          <>
            <Button variant="peligro" loading={eliminando} icon={<Trash2 className="size-4" />} onClick={() => onEliminar(canal)}>Eliminar</Button>
            <Button variant="secundario" icon={<Pencil className="size-4" />} onClick={() => onEditar(canal)}>Editar</Button>
          </>
        )
      }
    >
      {loading && (
        <div className="flex items-center justify-center gap-2.5 py-8 text-muted">
          <Loader2 className="size-5 animate-spin" /> Cargando detalle…
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertTriangle className="size-7 text-recording" />
          <p className="text-small text-muted">{error}</p>
          <Button variant="secundario" size="sm" onClick={recargar}>Reintentar</Button>
        </div>
      )}

      {!loading && canal && (
        <dl className="flex flex-col gap-4">
          <Dato titulo="Nombre">
            <span className="flex items-center gap-2 font-medium">
              {canal.tipo === 'texto' ? <Hash className="size-[18px] text-muted" /> : <Headphones className="size-[18px] text-muted" />}
              {canal.nombre}
            </span>
          </Dato>
          <Dato titulo="Tipo">{canal.tipo === 'texto' ? 'Texto · mensajes y archivos' : 'Voz · con subtítulos en vivo'}</Dato>
          <Dato titulo="Acceso">{canal.privado ? 'Privado · solo roles autorizados' : 'General · todo el servidor'}</Dato>
          <Dato titulo="Descripción">{canal.descripcion || <span className="text-muted">Sin descripción</span>}</Dato>
          <Dato titulo="Identificador"><code className="text-small text-muted">{canal.canalId}</code></Dato>
          <Link to={rutas.canal(serverId, canal.canalId)} className="self-start text-small font-medium text-primary hover:underline">
            Abrir canal →
          </Link>
        </dl>
      )}
    </Modal>
  )
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption font-medium text-muted">{titulo}</dt>
      <dd className="text-body">{children}</dd>
    </div>
  )
}

/** Modal «Crear canal» (o «Editar canal» si recibe uno). */
function ModalCanal({ serverId, canal, onClose, onGuardado }: { serverId: string; canal?: Canal; onClose: () => void; onGuardado: () => void }) {
  const notify = useUiStore((s) => s.notify)
  const editando = Boolean(canal)
  const [nombre, setNombre] = useState(canal?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoCanal>(canal?.tipo ?? 'texto')
  const [descripcion, setDescripcion] = useState(canal?.descripcion ?? '')
  const [acceso, setAcceso] = useState<'general' | 'privado'>(canal?.privado ? 'privado' : 'general')
  const [roles, setRoles] = useState<string[]>(['Coordinación', 'Estudiantes'])

  // los errores solo se muestran cuando el usuario ya toco el campo o intento enviar
  const [tocado, setTocado] = useState({ nombre: false, descripcion: false })
  const [enviando, setEnviando] = useState(false)
  // errores que regresa el servidor (por ejemplo nombre repetido)
  const [errorServidor, setErrorServidor] = useState<{ nombre?: string; descripcion?: string }>({})

  const datos = { nombre, tipo, descripcion, privado: acceso === 'privado' }
  const errores = validarCanal(datos, roles)
  const errorNombre = (tocado.nombre ? errores.nombre : undefined) ?? errorServidor.nombre
  const errorDescripcion = (tocado.descripcion ? errores.descripcion : undefined) ?? errorServidor.descripcion

  // los canales de texto usan minusculas y guiones
  const cambiarNombre = (v: string) => {
    setNombre(tipo === 'texto' ? v.toLowerCase().replace(/\s+/g, '-') : v)
    setErrorServidor({})
  }

  const cambiarTipo = (t: TipoCanal) => {
    setTipo(t)
    if (t === 'texto') setNombre(nombre.toLowerCase().replace(/\s+/g, '-'))
  }

  const siguienteRol = ROLES_DISPONIBLES.find((r) => !roles.includes(r))

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    setTocado({ nombre: true, descripcion: true })
    if (hayErrores(errores)) return

    setEnviando(true)
    try {
      if (canal) {
        const editado = await channelService.update(canal.canalId, datos)
        notify('exito', 'Canal actualizado', `Guardamos los cambios de ${etiquetaCanal(editado)}.`)
      } else {
        const nuevo = await channelService.create(serverId, datos)
        notify('exito', 'Canal creado correctamente', `${etiquetaCanal(nuevo)} ya está listo para tu equipo.`)
      }
      onGuardado()
    } catch (err) {
      if (err instanceof ApiError && (err.campo === 'nombre' || err.campo === 'descripcion')) {
        setErrorServidor({ [err.campo]: err.message })
      } else {
        manejarError(err, editando ? 'No se pudo guardar el canal' : 'No se pudo crear el canal')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      open
      onClose={() => !enviando && onClose()}
      titulo={editando ? 'Editar canal' : 'Crear canal'}
      acciones={
        <>
          <Button variant="secundario" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button type="submit" form="form-canal" loading={enviando}>
            {enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear canal'}
          </Button>
        </>
      }
    >
      <form id="form-canal" onSubmit={guardar} noValidate className="flex flex-col gap-5">
        <Field
          label="Nombre del canal"
          placeholder={tipo === 'texto' ? 'critica-final' : 'Sala de estudio'}
          icon={tipo === 'texto' ? <Hash className="size-[18px]" /> : <Headphones className="size-[18px]" />}
          value={nombre}
          maxLength={REGLAS.canalNombreMax}
          onChange={(e) => cambiarNombre(e.target.value)}
          onBlur={() => setTocado({ ...tocado, nombre: true })}
          error={errorNombre}
          help={tipo === 'texto' ? 'Minúsculas, números y guiones.' : `${nombre.length} de ${REGLAS.canalNombreMax} caracteres`}
          disabled={enviando}
          autoFocus
        />

        <fieldset className="flex flex-col gap-2" disabled={enviando}>
          <legend className="mb-2 text-small font-medium">Tipo de canal</legend>
          <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
            <OpcionTipo activa={tipo === 'texto'} onClick={() => cambiarTipo('texto')} icono={<Hash className="size-[18px]" />} titulo="Texto" detalle="Mensajes y archivos" />
            <OpcionTipo activa={tipo === 'voz'} onClick={() => cambiarTipo('voz')} icono={<Headphones className="size-[18px]" />} titulo="Voz" detalle="Con subtítulos" />
          </div>
        </fieldset>

        <TextArea
          label="Descripción"
          placeholder="Opcional. Explica para qué sirve el canal."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          onBlur={() => setTocado({ ...tocado, descripcion: true })}
          error={errorDescripcion}
          help={`${descripcion.length} de ${REGLAS.canalDescripcionMax} caracteres`}
          disabled={enviando}
          rows={2}
        />

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
                  <button type="button" onClick={() => setRoles(roles.filter((x) => x !== r))} className="rounded-full p-0.5 text-muted hover:text-fg" aria-label={`Quitar ${r}`}>
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                disabled={!siguienteRol}
                onClick={() => siguienteRol && setRoles([...roles, siguienteRol])}
                className="flex h-8 items-center gap-1 rounded-full border border-line px-3 text-small text-muted hover:text-fg disabled:opacity-50"
              >
                <Plus className="size-3.5" /> Agregar rol
              </button>
            </div>
            {errores.roles && <p className="text-caption text-recording">{errores.roles}</p>}
          </div>
        )}
      </form>
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
