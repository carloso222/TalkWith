import { Navigate, useParams } from 'react-router'
import { rutas } from '../lib/routes'

/**
 * Los enlaces que se comparten son /i/:codigo. El código viaja en la ruta (no en ?query)
 * para que, si no hay sesión, el login regrese aquí mismo (ProtectedRoute recuerda el pathname).
 */
export default function EnlaceInvitacion() {
  const { codigo = '' } = useParams()
  return <Navigate to={rutas.unirseCon(codigo)} replace />
}
