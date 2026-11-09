import { useAuthStore } from '../store/authStore'
import { useDatosStore } from '../store/datosStore'
import type { Canal, Miembro, Rol, Usuario } from '../types'

export const yo: Usuario = { uid: 'yo', nombre: 'Yo', usuario: 'yo', correo: 'yo@test.com', iniciales: 'YO', color: '#6366f1', estado: 'en-linea' }

export const miembro = (servidorId: string, uid: string, rol: Rol, unidoEn = '2026-09-01'): Miembro => ({
  miembroId: uid, servidorId, uid, rol, unidoEn, correo: `${uid}@test.com`,
})

export const canal = (servidorId: string, canalId: string, nombre: string, tipo: Canal['tipo'] = 'texto'): Canal => ({
  canalId, servidorId, nombre, tipo,
})

/** Deja la caché como si el servidor `sid` ya estuviera cargado, con estos miembros y canales. */
export function poblarServidor(sid: string, miembros: Array<[string, Rol]>, canales: Canal[] = [], nombre = `Servidor ${sid}`): void {
  const s = useDatosStore.getState()
  s.ponerServidor(sid, { servidorId: sid, nombre, descripcion: '', iniciales: 'SS', color: '#6366f1', propietarioUid: 'dueno', privacidad: 'invitacion' })
  s.ponerMiembros(sid, Object.fromEntries(miembros.map(([uid, rol]) => [uid, miembro(sid, uid, rol)])))
  s.ponerCanales(sid, canales)
}

/** Sesión iniciada como `yo` y caché vacía y lista. */
export function iniciarComoYo(): void {
  useDatosStore.getState().limpiar()
  useDatosStore.getState().ponerEstado('listo')
  useAuthStore.setState({ estado: 'autenticado', usuario: yo, perfilCompleto: true, rolDemo: null })
}
