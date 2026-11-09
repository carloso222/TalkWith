import type { Rol } from '../types'

/**
 * Espejo de las reglas de `firestore.rules` (colección `miembros`) solo para la interfaz:
 * decide qué botones mostrar y evita escrituras que se sabe que se van a rechazar.
 * La frontera real de seguridad son las reglas de Firestore, no este archivo.
 */
export interface Objetivo {
  uid: string
  rol: Rol
}

/** Solo el propietario asigna admin/miembro, a otra persona que no sea propietaria. */
export function puedeCambiarRol(miRol: Rol | null, miUid: string, objetivo: Objetivo): boolean {
  return miRol === 'propietario' && objetivo.uid !== miUid && objetivo.rol !== 'propietario'
}

/** Propietario retira a cualquiera que no sea propietario; admin solo a miembros; nadie a sí mismo (eso es salir). */
export function puedeRetirar(miRol: Rol | null, miUid: string, objetivo: Objetivo): boolean {
  if (objetivo.uid === miUid) return false
  if (miRol === 'propietario') return objetivo.rol !== 'propietario'
  return miRol === 'admin' && objetivo.rol === 'miembro'
}

/** Cualquier miembro puede salir, salvo la persona propietaria. */
export function puedeSalir(miRol: Rol | null): boolean {
  return miRol === 'admin' || miRol === 'miembro'
}
