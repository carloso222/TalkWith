import { AlertCircle, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { useParams } from 'react-router'
import Button from '../../components/ui/Button'
import { Field, TextArea } from '../../components/ui/Field'
import ServerIcon from '../../components/ui/ServerIcon'
import { serverService } from '../../services'
import { useUiStore } from '../../store/uiStore'
import Seccion from './Seccion'

const MAX_NOMBRE = 50
const MAX_IMAGEN_MB = 5

/** Figma 24 · Información general. Los cambios no se guardan en ningún lado. */
export default function General() {
  const { serverId = '' } = useParams()
  const servidor = serverService.find(serverId)!
  const notify = useUiStore((s) => s.notify)

  // "guardado" es la versión de referencia; al guardar solo se actualiza en memoria.
  const [guardado, setGuardado] = useState({ nombre: servidor.nombre, descripcion: servidor.descripcion, imagen: null as string | null })
  const [nombre, setNombre] = useState(guardado.nombre)
  const [descripcion, setDescripcion] = useState(guardado.descripcion)
  const [imagen, setImagen] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  const cambios = nombre !== guardado.nombre || descripcion !== guardado.descripcion || imagen !== guardado.imagen

  const elegirImagen = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_IMAGEN_MB * 1024 * 1024) {
      notify('error', 'No se pudo subir la imagen', `El archivo supera los ${MAX_IMAGEN_MB} MB. Intenta con una imagen más ligera.`)
      return
    }
    setImagen(URL.createObjectURL(f))
  }

  const descartar = () => {
    setNombre(guardado.nombre)
    setDescripcion(guardado.descripcion)
    setImagen(guardado.imagen)
  }

  const guardar = () => {
    if (!nombre.trim()) {
      notify('error', 'Falta el nombre', 'El servidor necesita un nombre para mostrarse.')
      return
    }
    setGuardado({ nombre, descripcion, imagen })
    notify('exito', 'Cambios guardados', 'Es solo una demostración: no se guardó en ningún servidor.')
  }

  return (
    <Seccion
      titulo="Información general"
      descripcion="Así verán tu servidor las personas a las que invites."
      pie={
        cambios && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line px-10 py-4">
            <p className="flex items-center gap-2.5 text-small">
              <AlertCircle className="size-[18px] text-warning" /> Tienes cambios sin guardar
            </p>
            <div className="flex gap-3">
              <Button variant="secundario" onClick={descartar}>Descartar</Button>
              <Button onClick={guardar}>Guardar cambios</Button>
            </div>
          </div>
        )
      }
    >
      <div className="flex max-w-[746px] flex-col gap-6">
        <div className="flex items-center gap-5">
          {imagen ? (
            <img src={imagen} alt="Imagen del servidor" className="size-[84px] rounded-[22px] object-cover" />
          ) : (
            <ServerIcon servidor={{ ...servidor, nombre }} size={84} className="text-heading" />
          )}
          <div className="flex flex-col gap-1">
            <p className="text-small font-medium">Imagen del servidor</p>
            <p className="text-small text-muted">PNG o JPG de al menos 256 × 256 px. Se recorta en forma redondeada.</p>
            <div className="mt-2 flex items-center gap-2">
              <Button variant="secundario" size="sm" icon={<Upload className="size-4" />} onClick={() => archivo.current?.click()}>Subir imagen</Button>
              <Button variant="fantasma" size="sm" onClick={() => setImagen(null)} disabled={!imagen}>Quitar imagen</Button>
              <input ref={archivo} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => elegirImagen(e.target.files?.[0])} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Field label="Nombre del servidor" value={nombre} maxLength={MAX_NOMBRE} onChange={(e) => setNombre(e.target.value)} />
          <p className="text-right text-caption text-muted">{nombre.length} de {MAX_NOMBRE} caracteres</p>
        </div>
        <TextArea label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={4} />
      </div>
    </Seccion>
  )
}
