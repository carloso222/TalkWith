import type { Rol } from '../../types'

export type RolAsignable = 'admin' | 'miembro'

export const ETIQUETA_ROL: Record<Rol, string> = { propietario: 'Propietario', admin: 'Administrador', miembro: 'Miembro' }
