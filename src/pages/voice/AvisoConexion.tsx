import { Loader2, WifiOff } from 'lucide-react'
import Button from '../../components/ui/Button'
import type { EstadoSala } from '../../hooks/useSalaVoz'

/** Aviso arriba de la sala cuando no hay conexion con el servidor de voz. */
export default function AvisoConexion({ estado, error, onReintentar }: { estado: EstadoSala; error: string; onReintentar: () => void }) {
  if (estado === 'conectado') return null

  let titulo = 'Conectando a la llamada…'
  let texto = 'Estamos avisando a las demás personas que entraste.'
  if (estado === 'reconectando') {
    titulo = 'Se perdió la conexión'
    texto = 'Intentando reconectar. Tu lugar en la llamada se guarda unos segundos.'
  }
  if (estado === 'error') {
    titulo = 'No pudiste entrar a la llamada'
    texto = error
  }
  const esperando = estado !== 'error'

  return (
    <div
      role={esperando ? 'status' : 'alert'}
      className={`mx-6 mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${esperando ? 'border-primary/40 bg-primary/10' : 'border-recording/40 bg-recording/10'}`}
    >
      {esperando ? <Loader2 className="size-5 shrink-0 animate-spin text-primary" /> : <WifiOff className="size-5 shrink-0 text-recording" />}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-small font-medium">{titulo}</p>
        <p className="text-caption text-muted">{texto}</p>
      </div>
      {!esperando && (
        <Button variant="secundario" size="sm" onClick={onReintentar}>Reintentar</Button>
      )}
    </div>
  )
}
