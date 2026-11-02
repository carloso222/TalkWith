import { Mic, SlidersHorizontal } from 'lucide-react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import type { useMicrofono } from '../../hooks/useMicrofono'
import { cn } from '../../lib/cn'

type Microfono = ReturnType<typeof useMicrofono>

/** Ventana para elegir el microfono y probar que se escucha. */
export default function AjustesAudio({ mic, onClose }: { mic: Microfono; onClose: () => void }) {
  const barras = 20
  const encendidas = Math.round(mic.nivel * barras)

  return (
    <Modal
      open
      onClose={onClose}
      titulo="Ajustes de audio"
      descripcion="Elige el micrófono que quieres usar y habla para probarlo."
      icono={<SlidersHorizontal className="size-6" />}
      acciones={<Button onClick={onClose}>Listo</Button>}
    >
      {mic.listo ? (
        <>
          <label className="flex flex-col gap-2">
            <span className="text-small font-medium">Micrófono</span>
            <select
              value={mic.dispositivoActual}
              onChange={(e) => mic.cambiarDispositivo(e.target.value)}
              className="h-11 w-full rounded-[10px] border border-line bg-raised px-3 text-body text-fg focus:border-primary focus:outline-none"
            >
              {mic.dispositivos.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Micrófono ${i + 1}`}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-small font-medium">
              <Mic className="size-4 text-muted" /> Prueba tu micrófono
            </span>
            <div className="flex h-6 items-end gap-1" aria-label={`Nivel del micrófono ${Math.round(mic.nivel * 100)} %`}>
              {Array.from({ length: barras }, (_, i) => (
                <span key={i} className={cn('h-full flex-1 rounded-sm transition-colors', i < encendidas ? 'bg-voice' : 'bg-raised')} />
              ))}
            </div>
            <p className="text-caption text-muted">
              {mic.silenciado ? 'Estás silenciado: activa el micrófono para ver el nivel.' : 'Si las barras se mueven al hablar, tu micrófono funciona.'}
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-small text-muted">
            {mic.estado === 'pidiendo' ? 'Esperando el permiso del navegador…' : 'El micrófono no está disponible. Revisa los permisos o conecta uno.'}
          </p>
          {mic.estado !== 'pidiendo' && (
            <Button variant="secundario" size="sm" onClick={mic.reintentar}>Reintentar</Button>
          )}
        </div>
      )}
    </Modal>
  )
}
