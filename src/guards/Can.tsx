import type { ReactNode } from 'react'
import { useCurrentRole } from '../hooks/useCurrentRole'
import type { Rol } from '../types'

/**
 * "Directiva" estructural de permisos — el equivalente a un *ngIf por rol.
 *
 *   <Can roles={['propietario', 'admin']}>
 *     <BotonConfiguracion />
 *   </Can>
 */
export default function Can({ roles, children, fallback = null, serverId }: { roles: Rol[]; children: ReactNode; fallback?: ReactNode; serverId?: string }) {
  const rol = useCurrentRole(serverId)
  return <>{rol && roles.includes(rol) ? children : fallback}</>
}
