import { create } from 'zustand'
import { cerrarSesion } from '../services/authService'
import type { Rol, Usuario } from '../types'

/**
 * Sesión en memoria. La fuente de verdad es Firebase Auth: el listener de
 * `lib/sesion.ts` llena este store al cargar la página y lo limpia al salir.
 * No se persiste en ningún almacenamiento del navegador.
 *
 * `rolDemo` sobrescribe el rol real solo en desarrollo, para demostrar las guardias.
 */
export type EstadoSesion = 'cargando' | 'anonimo' | 'autenticado'

interface AuthState {
  estado: EstadoSesion
  usuario: Usuario | null
  rolDemo: Rol | null
  perfilCompleto: boolean
  /** Mensaje para el login cuando la sesión se perdió sin que la persona la cerrara. */
  avisoLogin: string | null
  /** true mientras la persona cierra sesión a propósito (así no se confunde con una sesión perdida). */
  cerrandoSesion: boolean
  setSesion: (usuario: Usuario, perfilCompleto: boolean) => void
  /** Vuelve al estado anónimo (incluido `rolDemo`). No borra `avisoLogin`. */
  limpiar: () => void
  setRolDemo: (rol: Rol | null) => void
  setAvisoLogin: (aviso: string | null) => void
  /** Cierra la sesión en Firebase; la limpieza del estado la hace el listener. */
  logout: () => Promise<void>
  /** Actualiza el usuario en memoria (no se guarda en ningún servidor). */
  actualizarPerfil: (cambios: Partial<Pick<Usuario, 'nombre' | 'usuario' | 'estadoTexto'>>) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  estado: 'cargando',
  usuario: null,
  rolDemo: null,
  perfilCompleto: false,
  avisoLogin: null,
  cerrandoSesion: false,
  setSesion: (usuario, perfilCompleto) => set({ estado: 'autenticado', usuario, perfilCompleto, avisoLogin: null }),
  limpiar: () => set({ estado: 'anonimo', usuario: null, rolDemo: null, perfilCompleto: false, cerrandoSesion: false }),
  setRolDemo: (rolDemo) => set({ rolDemo }),
  setAvisoLogin: (avisoLogin) => set({ avisoLogin }),
  logout: () => {
    set({ cerrandoSesion: true, avisoLogin: null })
    return cerrarSesion().catch((e) => {
      set({ cerrandoSesion: false })
      throw e
    })
  },
  actualizarPerfil: (cambios) => set((s) => (s.usuario ? { usuario: { ...s.usuario, ...cambios } } : s)),
}))
