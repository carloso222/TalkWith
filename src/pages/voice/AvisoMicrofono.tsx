import { Loader2, MicOff } from 'lucide-react'
import Button from '../../components/ui/Button'
import type { EstadoMicrofono } from '../../hooks/useMicrofono'

// textos para cada estado del microfono
const mensajes: Record<Exclude<EstadoMicrofono, 'listo'>, { titulo: string; texto: string; reintentar: boolean }> = {
  pidiendo: {
    titulo: 'Permite el acceso al micrófono',
    texto: 'Tu navegador te está preguntando si TalkWith puede usar el micrófono.',
    reintentar: false,
  },
  denegado: {
    titulo: 'El micrófono está bloqueado',
    texto: 'Haz clic en el candado junto a la dirección, activa «Micrófono» y vuelve a intentar.',
    reintentar: true,
  },
  'sin-microfono': {
    titulo: 'No encontramos un micrófono',
    texto: 'Conecta un micrófono o audífonos con micrófono y vuelve a intentar.',
    reintentar: true,
  },
  'no-soportado': {
    titulo: 'Tu navegador no permite usar el micrófono',
    texto: 'Abre TalkWith en Chrome, Edge o Firefox actualizados (con https o localhost).',
    reintentar: false,
  },
  error: {
    titulo: 'No pudimos activar el micrófono',
    texto: 'Puede que otra aplicación lo esté usando. Ciérrala y vuelve a intentar.',
    reintentar: true,
  },
}

/** Aviso arriba de la sala cuando el microfono no esta listo. */
export default function AvisoMicrofono({ estado, onReintentar }: { estado: EstadoMicrofono; onReintentar: () => void }) {
  if (estado === 'listo') return null
  const m = mensajes[estado]
  const esperando = estado === 'pidiendo'

  return (
    <div
      role="status"
      className={`mx-6 mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${esperando ? 'border-primary/40 bg-primary/10' : 'border-warning/40 bg-warning/10'}`}
    >
      {esperando ? <Loader2 className="size-5 shrink-0 animate-spin text-primary" /> : <MicOff className="size-5 shrink-0 text-warning" />}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-small font-medium">{m.titulo}</p>
        <p className="text-caption text-muted">{m.texto} Mientras tanto entras a la llamada silenciado.</p>
      </div>
      {m.reintentar && (
        <Button variant="secundario" size="sm" onClick={onReintentar}>Reintentar</Button>
      )}
    </div>
  )
}
