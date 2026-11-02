import { Globe, Lock, Plus, Upload } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Button from '../../components/ui/Button'
import { Field, TextArea } from '../../components/ui/Field'
import { cn } from '../../lib/cn'
import { rutas } from '../../lib/routes'
import { useUiStore } from '../../store/uiStore'
import type { Servidor } from '../../types'
import ModalServidor from './ModalServidor'
import { useCerrarModal } from './useCerrarModal'

const MAX_NOMBRE = 50
const MAX_IMAGEN_MB = 5

/** Convierte "Club de Diseño UX" en "club-diseno-ux" para el enlace de invitación. */
const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\b(de|del|la|el|y)\b/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Figma 07 · Crear servidor y 09 · Notificaciones. Responsable: Isaian.
 * No se guarda nada: al crear solo se muestran los toasts de ejemplo.
 */
export default function CrearServidor() {
  const navigate = useNavigate()
  const cerrar = useCerrarModal()
  const notify = useUiStore((s) => s.notify)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [privacidad, setPrivacidad] = useState<Servidor['privacidad']>('invitacion')
  const [imagen, setImagen] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  const elegirImagen = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_IMAGEN_MB * 1024 * 1024) {
      notify('error', 'No se pudo subir la imagen', `El archivo supera los ${MAX_IMAGEN_MB} MB. Intenta con una imagen más ligera.`)
      return
    }
    // Vista previa local; la imagen no se sube a ningún lado.
    setImagen(URL.createObjectURL(f))
  }

  const crear = (e?: FormEvent) => {
    e?.preventDefault()
    const n = nombre.trim()
    if (!n) return
    notify('exito', 'Servidor creado correctamente', `${n} ya está listo. Invita a tu equipo para empezar.`)
    notify('info', 'Enlace de invitación copiado', `talkwith.app/i/${slug(n) || 'servidor'}-9QF1 está en tu portapapeles.`)
    navigate(rutas.inicio)
  }

  return (
    <ModalServidor
      pestana="crear"
      titulo="Crea tu servidor"
      descripcion="Un servidor es el espacio de tu comunidad, con sus propios canales de texto y de voz."
      icono={<Plus className="size-6" />}
      acciones={
        <>
          <Button variant="secundario" onClick={cerrar}>Cancelar</Button>
          <Button onClick={() => crear()} disabled={!nombre.trim()}>Crear servidor</Button>
        </>
      }
    >
      <form onSubmit={crear} className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => archivo.current?.click()}
            className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full border-[1.5px] border-dashed border-line text-caption text-muted transition-colors hover:border-muted hover:text-fg"
            aria-label="Subir imagen del servidor"
          >
            {imagen ? (
              <img src={imagen} alt="" className="size-full object-cover" />
            ) : (
              <>
                <Upload className="size-[18px]" />
                Subir
              </>
            )}
          </button>
          <input ref={archivo} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => elegirImagen(e.target.files?.[0])} />
          <div className="flex flex-col gap-1">
            <p className="text-small font-medium">Imagen del servidor (opcional)</p>
            <p className="text-caption text-muted">PNG o JPG de al menos 256 × 256 px.</p>
          </div>
        </div>

        <Field
          label="Nombre del servidor"
          placeholder="Club de Diseño UX"
          value={nombre}
          maxLength={MAX_NOMBRE}
          onChange={(e) => setNombre(e.target.value)}
          help={`${nombre.length} de ${MAX_NOMBRE} caracteres`}
          autoFocus
        />
        <TextArea
          label="Descripción (opcional)"
          placeholder="Comunidad para revisar portafolios y practicar entrevistas."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-small font-medium">Privacidad</legend>
          <div className="grid grid-cols-2 gap-2">
            <OpcionPrivacidad activa={privacidad === 'invitacion'} onClick={() => setPrivacidad('invitacion')} icono={<Lock className="size-4" />} titulo="Solo por invitación">
              Únicamente quien reciba un enlace podrá entrar.
            </OpcionPrivacidad>
            <OpcionPrivacidad activa={privacidad === 'enlace'} onClick={() => setPrivacidad('enlace')} icono={<Globe className="size-4" />} titulo="Abierto con enlace">
              Cualquiera con el enlace público puede unirse.
            </OpcionPrivacidad>
          </div>
        </fieldset>
      </form>
    </ModalServidor>
  )
}

function OpcionPrivacidad({ activa, onClick, icono, titulo, children }: { activa: boolean; onClick: () => void; icono: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activa}
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-colors',
        activa ? 'border-primary bg-primary/10' : 'border-line hover:bg-raised/60',
      )}
    >
      <span className="flex items-center gap-2 text-small font-medium">
        <span className={activa ? 'text-primary' : 'text-muted'}>{icono}</span>
        {titulo}
      </span>
      <span className="text-caption text-muted">{children}</span>
    </button>
  )
}
