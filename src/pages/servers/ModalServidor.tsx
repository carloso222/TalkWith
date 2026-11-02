import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import Modal from '../../components/ui/Modal'
import Segmented from '../../components/ui/Segmented'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { rutas } from '../../lib/routes'
import Dashboard from '../dashboard/Dashboard'
import { useCerrarModal } from './useCerrarModal'

type Pestana = 'crear' | 'unirse'

interface Props {
  pestana: Pestana
  titulo: string
  descripcion: string
  icono: ReactNode
  acciones: ReactNode
  children: ReactNode
}

/**
 * Figma 07 y 08: el modal "Crea tu servidor / Únete a un servidor" se abre
 * encima del Inicio. Las dos pestañas son rutas distintas para poder enlazarlas.
 */
export default function ModalServidor({ pestana, titulo, descripcion, icono, acciones, children }: Props) {
  useDocumentTitle(titulo)
  const navigate = useNavigate()
  const cerrar = useCerrarModal()

  return (
    <>
      <Dashboard />
      <Modal open onClose={cerrar} titulo={titulo} descripcion={descripcion} icono={icono} acciones={acciones}>
        <Segmented<Pestana>
          label="Crear o unirse"
          valor={pestana}
          onChange={(v) => navigate(v === 'crear' ? rutas.crearServidor : rutas.unirse, { replace: true })}
          opciones={[
            { valor: 'crear', label: 'Crear servidor' },
            { valor: 'unirse', label: 'Unirme con invitación' },
          ]}
        />
        {children}
      </Modal>
    </>
  )
}
