import { AlertTriangle } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

/**
 * Diálogo de confirmación global ("¿Deseas eliminar este registro? Sí / No").
 * Se abre con `await useUiStore.getState().confirm({...})`. Nunca borra nada por sí mismo.
 */
export default function ConfirmHost() {
  const dialogo = useUiStore((s) => s.dialogo)
  const cerrar = useUiStore((s) => s.cerrarDialogo)
  if (!dialogo) return null
  return (
    <Modal
      open
      ancho="sm"
      tono={dialogo.peligro ? 'peligro' : 'primary'}
      onClose={() => cerrar(false)}
      titulo={dialogo.titulo}
      descripcion={dialogo.descripcion}
      icono={dialogo.peligro ? <AlertTriangle className="size-6 text-recording" /> : undefined}
      acciones={
        <>
          <Button variant="secundario" onClick={() => cerrar(false)}>{dialogo.cancelar ?? 'Cancelar'}</Button>
          <Button variant={dialogo.peligro ? 'peligro' : 'primario'} onClick={() => cerrar(true)}>{dialogo.confirmar ?? 'Confirmar'}</Button>
        </>
      }
    />
  )
}
